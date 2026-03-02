/**
 * LinkedIn Import Service
 *
 * Processes LinkedIn connections CSV: classifies company names via 4-layer
 * pipeline, matches/creates companies, upserts team members, enriches with
 * company data, and scores ICP fit.
 *
 * Flow: Parse CSV → Classify (4-layer) → Process rows → Enrich → ICP Score
 */

import { parse } from 'csv-parse/sync'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'
import type {
  LinkedInConnection,
  ImportResult,
  TeamMember,
  Customer,
  IcpSettings,
} from '../types/customer.js'
import { CompanyClassificationService, type ClassificationInput, type ClassificationResult } from './CompanyClassificationService.js'
import { EnrichmentService } from './EnrichmentService.js'
import { IcpScoringService } from './IcpScoringService.js'
import { CustomerService } from './CustomerService.js'

// =============================================================================
// CSV Column Mapping
// =============================================================================

const EXPECTED_COLUMNS = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position']

function parseLinkedInCsv(buffer: Buffer): LinkedInConnection[] {
  const content = buffer.toString('utf-8').replace(/^\uFEFF/, '') // Strip BOM

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  if (records.length === 0) return []

  // Validate columns exist in the header
  const headers = Object.keys(records[0])
  const missing = EXPECTED_COLUMNS.filter(col => !headers.includes(col))
  if (missing.length > 0) {
    throw new Error(
      `Invalid CSV format. Missing columns: ${missing.join(', ')}. ` +
      `Expected: ${EXPECTED_COLUMNS.join(', ')}`
    )
  }

  return records.map(row => ({
    firstName: (row['First Name'] || '').trim(),
    lastName: (row['Last Name'] || '').trim(),
    url: (row['URL'] || '').trim(),
    emailAddress: (row['Email Address'] || '').trim(),
    company: (row['Company'] || '').trim(),
    position: (row['Position'] || '').trim(),
  }))
}

// =============================================================================
// Progress Callback
// =============================================================================

export type ImportProgressEvent =
  | { phase: 'classifying'; current: number; total: number }
  | { phase: 'importing'; current: number; total: number }
  | { phase: 'enriching'; current: number; total: number; company: string }

export type OnProgress = (event: ImportProgressEvent) => void

// =============================================================================
// Service
// =============================================================================

export class LinkedInImportService {
  constructor(private supabase: SupabaseClient) {}

  async import(csvBuffer: Buffer, onProgress?: OnProgress): Promise<ImportResult> {
    const connections = parseLinkedInCsv(csvBuffer)

    // Resolve user ID once for all inserts (RLS requires user_id = auth.uid())
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unable to resolve authenticated user')
    const userId = user.id

    const result: ImportResult = {
      total: connections.length,
      companies: { created: 0, matched: 0 },
      teamMembers: { created: 0, updated: 0 },
      skipped: [],
      errors: [],
    }

    // =========================================================================
    // Phase 0: Classify all unique company names (4-layer pipeline)
    // =========================================================================

    const classificationService = new CompanyClassificationService()
    const classificationInputs: ClassificationInput[] = connections
      .filter(conn => conn.company.trim().length > 0)
      .map(conn => ({
        companyName: conn.company,
        firstName: conn.firstName,
        lastName: conn.lastName,
        position: conn.position,
      }))

    const classifications = await classificationService.classifyBatch(
      classificationInputs,
      (current, total) => {
        onProgress?.({ phase: 'classifying', current, total })
      },
    )

    // Track classification stats
    result.classification = { layer0: 0, layer1: 0, layer2: 0, layer3: 0, total: classifications.size }
    for (const c of classifications.values()) {
      const layerKey = `layer${c.layer}` as 'layer0' | 'layer1' | 'layer2' | 'layer3'
      result.classification[layerKey]++
    }

    // =========================================================================
    // Phase 1: Process rows using cached classifications
    // =========================================================================

    const companyCache = new Map<string, Customer>()
    const newCustomerIds = new Set<string>()
    const lowConfidenceCustomerIds = new Set<string>()

    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i]
      const rowNum = i + 2 // +2 for 1-based index + header row

      onProgress?.({ phase: 'importing', current: i + 1, total: connections.length })

      try {
        await this.processRow(
          conn, rowNum, result, companyCache, userId,
          newCustomerIds, lowConfidenceCustomerIds, classifications,
        )
      } catch (err) {
        result.errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // =========================================================================
    // Phase 2: Enrichment + ICP Scoring
    // =========================================================================

    await this.enrichAndScoreCustomers(
      companyCache, result, newCustomerIds, lowConfidenceCustomerIds, onProgress,
    )

    logger.info('[LinkedInImport] Import completed', {
      totalRows: result.total,
      companiesCreated: result.companies.created,
      companiesMatched: result.companies.matched,
      teamMembersCreated: result.teamMembers.created,
      teamMembersUpdated: result.teamMembers.updated,
      skippedCount: result.skipped.length,
      errorCount: result.errors.length,
      classificationLayers: result.classification,
      enriched: result.enrichment?.enriched ?? 0,
      icpScored: result.icpScores
        ? (result.icpScores.low + result.icpScores.medium + result.icpScores.high + result.icpScores.very_high)
        : 0,
      icpSkippedUnchanged: result.icpScores?.skipped_unchanged ?? 0,
    })

    return result
  }

  // ===========================================================================
  // Phase 1: Process Individual Row
  // ===========================================================================

  private async processRow(
    conn: LinkedInConnection,
    rowNum: number,
    result: ImportResult,
    companyCache: Map<string, Customer>,
    userId: string,
    newCustomerIds: Set<string>,
    lowConfidenceCustomerIds: Set<string>,
    classifications: Map<string, ClassificationResult>,
  ): Promise<void> {
    const companyName = conn.company

    // Skip empty company
    if (!companyName) {
      result.skipped.push({ row: rowNum, company: '(empty)', reason: 'No company name provided' })
      return
    }

    // Look up pre-computed classification
    const key = companyName.toLowerCase().trim()
    const classification = classifications.get(key)

    if (!classification || classification.type === 'skip') {
      result.skipped.push({
        row: rowNum,
        company: companyName,
        reason: classification?.reason || 'Unclassified',
      })
      return
    }

    // Resolve target company name (enclosed → container)
    const isEnclosed = classification.type === 'enclosed'
    const targetCompanyName = isEnclosed ? 'Enclosed company' : companyName

    // Find or create customer
    let customer = companyCache.get(targetCompanyName.toLowerCase())

    if (!customer) {
      customer = await this.findOrCreateCustomer(targetCompanyName, result, userId, newCustomerIds)
      companyCache.set(targetCompanyName.toLowerCase(), customer)

      // Store LinkedIn company URL from Layer 1 if available
      if (classification.linkedinCompanyUrl) {
        await this.supabase.rpc('merge_customer_info', {
          cid: customer.id,
          new_info: { linkedin_company_url: classification.linkedinCompanyUrl },
        })
        customer.info = { ...customer.info, linkedin_company_url: classification.linkedinCompanyUrl }
      }

      // Track low-confidence customers
      if (classification.lowConfidence) {
        lowConfidenceCustomerIds.add(customer.id)
      }
    }

    // Upsert team member
    await this.upsertTeamMember(customer, conn, rowNum, result)
  }

  // ===========================================================================
  // Customer Management
  // ===========================================================================

  private async findOrCreateCustomer(
    name: string,
    result: ImportResult,
    userId: string,
    newCustomerIds: Set<string>,
  ): Promise<Customer> {
    // Try to find existing customer (case-insensitive)
    const { data: existing, error: findError } = await this.supabase
      .from('customers')
      .select('*')
      .ilike('name', name)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (findError) {
      throw new Error(`Database error finding customer: ${findError.message}`)
    }

    if (existing) {
      result.companies.matched++
      return existing as Customer
    }

    // Create new customer
    const { data: created, error: createError } = await this.supabase
      .from('customers')
      .insert({
        user_id: userId,
        name,
        status: 'not_relevant',
        info: {},
      })
      .select()
      .single()

    if (createError) {
      throw new Error(`Database error creating customer: ${createError.message}`)
    }

    result.companies.created++
    newCustomerIds.add(created.id)
    return created as Customer
  }

  // ===========================================================================
  // Team Member Management
  // ===========================================================================

  private async upsertTeamMember(
    customer: Customer,
    conn: LinkedInConnection,
    _rowNum: number,
    result: ImportResult,
  ): Promise<void> {
    const fullName = `${conn.firstName} ${conn.lastName}`.trim()
    if (!fullName) return

    // Read current team array
    const currentTeam: TeamMember[] = customer.info?.team || []

    // Match by email first, then by name
    let existingIndex = -1

    if (conn.emailAddress) {
      existingIndex = currentTeam.findIndex(
        m => m.email && m.email.toLowerCase() === conn.emailAddress.toLowerCase()
      )
    }

    if (existingIndex === -1) {
      existingIndex = currentTeam.findIndex(
        m => m.name.toLowerCase() === fullName.toLowerCase()
      )
    }

    let updatedTeam: TeamMember[]

    if (existingIndex >= 0) {
      // Update existing member
      const existing = currentTeam[existingIndex]
      const updates: Partial<TeamMember> = {}

      if (conn.url && existing.linkedin_url !== conn.url) {
        updates.linkedin_url = conn.url
      }
      if (conn.position && existing.role !== conn.position) {
        updates.role = conn.position
      }
      if (conn.emailAddress && !existing.email) {
        updates.email = conn.emailAddress
      }

      if (Object.keys(updates).length === 0) {
        // Nothing to update
        return
      }

      updatedTeam = [...currentTeam]
      updatedTeam[existingIndex] = { ...existing, ...updates }
      result.teamMembers.updated++
    } else {
      // Create new team member
      const newMember: TeamMember = {
        name: fullName,
        role: conn.position || undefined,
        email: conn.emailAddress || undefined,
        linkedin_url: conn.url || undefined,
      }

      updatedTeam = [...currentTeam, newMember]
      result.teamMembers.created++
    }

    // Atomic merge via RPC (shallow merge replaces entire team key)
    const { error } = await this.supabase.rpc('merge_customer_info', {
      cid: customer.id,
      new_info: { team: updatedTeam },
    })

    if (error) {
      throw new Error(`Failed to update team for customer: ${error.message}`)
    }

    // Update cache so subsequent rows for the same company see the latest team
    customer.info = { ...customer.info, team: updatedTeam }
  }

  // ===========================================================================
  // Phase 2: Enrichment + ICP Scoring
  // ===========================================================================

  private async enrichAndScoreCustomers(
    companyCache: Map<string, Customer>,
    result: ImportResult,
    newCustomerIds: Set<string>,
    lowConfidenceCustomerIds: Set<string>,
    onProgress?: OnProgress,
  ): Promise<void> {
    const enrichmentService = new EnrichmentService()
    const icpScoringService = new IcpScoringService()
    const customerService = new CustomerService(this.supabase)

    // Initialize Phase 2 result fields
    result.enrichment = { enriched: 0, skippedFresh: 0, failed: 0 }
    result.icpScores = { low: 0, medium: 0, high: 0, very_high: 0, not_scored: 0, skipped_unchanged: 0 }

    // Load user's ICP settings
    const { data: icpSettings } = await this.supabase
      .from('icp_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    const uniqueCustomers = Array.from(companyCache.values())
    const enrichableCustomers = uniqueCustomers.filter(c => c.name !== 'Enclosed company')
    let enrichIndex = 0

    for (const customer of uniqueCustomers) {
      // Skip "Enclosed company" container — no meaningful enrichment
      if (customer.name === 'Enclosed company') continue

      enrichIndex++
      onProgress?.({ phase: 'enriching', current: enrichIndex, total: enrichableCustomers.length, company: customer.name })

      let enrichmentData = customer.info?.enrichment
      let enrichmentChanged = false

      // --- Enrichment ---
      try {
        if (!EnrichmentService.isStale(enrichmentData)) {
          result.enrichment.skippedFresh++
          logger.debug('[LinkedInImport] Enrichment fresh, skipping', {
            companyName: customer.name,
          })
        } else {
          const linkedinUrl = customer.info?.linkedin_company_url
          const industryHint = customer.info?.vertical || customer.info?.product?.category || undefined
          const enrichResult = await enrichmentService.enrichCompany(customer.name, linkedinUrl, industryHint)

          if (enrichResult) {
            await customerService.updateEnrichment(customer.id, enrichResult.data, enrichResult.source)
            enrichmentData = {
              ...enrichResult.data,
              source: enrichResult.source,
              updated_at: new Date().toISOString(),
            }
            customer.info = { ...customer.info, enrichment: enrichmentData }
            enrichmentChanged = true
            result.enrichment.enriched++

            logger.info('[LinkedInImport] Company enriched', {
              companyName: customer.name,
              source: enrichResult.source,
              hasEmployeeCount: !!enrichResult.data.employee_count,
              hasAbout: !!enrichResult.data.about,
              hasIndustry: !!enrichResult.data.industry,
              specialtiesCount: enrichResult.data.specialties.length,
              hasLinkedinUrl: !!linkedinUrl,
            })
          } else {
            result.enrichment.failed++
            logger.info('[LinkedInImport] Company enrichment failed', {
              companyName: customer.name,
              hasLinkedinUrl: !!linkedinUrl,
            })
          }

          await EnrichmentService.delay()
        }
      } catch {
        logger.error('[LinkedInImport] Enrichment error', {
          hasError: true,
          companyName: customer.name,
        })
        result.enrichment.failed++
      }

      // --- ICP Scoring ---
      // Only score when: enrichment data changed, OR customer has no existing score
      try {
        const hasExistingScore = !!customer.info?.icp_score

        if (icpSettings && enrichmentData?.industry && (enrichmentChanged || !hasExistingScore)) {
          const score = await icpScoringService.scoreCustomer({
            enrichment: {
              employee_count: enrichmentData.employee_count || '',
              about: enrichmentData.about || '',
              industry: enrichmentData.industry || '',
              specialties: enrichmentData.specialties || [],
            },
            icpSettings: icpSettings as IcpSettings,
            companyName: customer.name,
          })

          await customerService.updateIcpScore(customer.id, score)
          result.icpScores[score]++

          // Upgrade new customers to 'lead' when ICP is medium or better
          // Skip upgrade for low-confidence classifications (Layer 3 fail-open)
          if (
            newCustomerIds.has(customer.id) &&
            !lowConfidenceCustomerIds.has(customer.id) &&
            ['medium', 'high', 'very_high'].includes(score)
          ) {
            await this.supabase
              .from('customers')
              .update({ status: 'lead' })
              .eq('id', customer.id)
          }
        } else if (!enrichmentChanged && hasExistingScore) {
          result.icpScores.skipped_unchanged++
          logger.debug('[LinkedInImport] ICP scoring skipped (enrichment unchanged, score exists)', {
            companyName: customer.name,
            existingScore: customer.info?.icp_score,
          })
        } else {
          result.icpScores.not_scored++
        }
      } catch {
        logger.error('[LinkedInImport] ICP scoring error', {
          hasError: true,
        })
        result.icpScores.not_scored++
      }
    }
  }
}
