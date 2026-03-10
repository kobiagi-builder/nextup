/**
 * Customer Controller
 *
 * Express request handlers for customer CRUD operations.
 * Uses inline Zod validation and CustomerService for business logic.
 */

import { Request, Response } from 'express'
import { z } from 'zod'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { CustomerService } from '../services/CustomerService.js'
import { EnrichmentService } from '../services/EnrichmentService.js'
import { IcpScoringService } from '../services/IcpScoringService.js'
import { VALID_CUSTOMER_STATUSES } from '../types/customer.js'
import { DEFAULT_ROLE_FILTERS, DEFAULT_ROLE_EXCLUSIONS } from '../services/EnrichmentService.js'
import type { Customer, CustomerIcp, TeamMember, TeamRoleFilter } from '../types/customer.js'

// =============================================================================
// Validation Schemas
// =============================================================================

const customerStatusSchema = z.enum([
  'lead', 'prospect', 'negotiation', 'live', 'on_hold', 'archive', 'not_relevant',
])

const teamMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  source: z.enum(['manual', 'linkedin_scrape']).optional(),
  hidden: z.boolean().optional(),
})

const customerInfoSchema = z.object({
  about: z.string().optional(),
  vertical: z.string().optional(),
  persona: z.string().optional(),
  icp: z.string().optional(),
  product: z.object({
    name: z.string().optional(),
    stage: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
  team: z.array(teamMemberSchema).optional(),
}).passthrough() // Allow extensible fields

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  status: customerStatusSchema.optional(),
  info: customerInfoSchema.optional(),
})

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: customerStatusSchema.optional(),
  info: customerInfoSchema.optional(),
})

const updateStatusSchema = z.object({
  status: customerStatusSchema,
})

const createEventSchema = z.object({
  event_type: z.string().optional(),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  participants: z.array(z.string()).optional(),
  event_date: z.string().datetime({ message: 'event_date must be a valid ISO datetime' }).optional(),
})

// =============================================================================
// Helper
// =============================================================================

function getService(req: Request): CustomerService {
  return new CustomerService(getSupabase())
}

/**
 * Auto-rescore ICP when customer info changes (fire-and-forget).
 * Runs only if both enrichment data and ICP settings exist.
 */
async function rescoreIcpIfNeeded(customer: Customer): Promise<void> {
  try {
    const enrichment = customer.info?.enrichment
    if (!enrichment?.employee_count && !enrichment?.industry) return

    const supabase = getSupabase()
    const { data: userCtx } = await supabase
      .from('user_context')
      .select('customers')
      .limit(1)
      .maybeSingle()

    const icpCriteria = userCtx?.customers as CustomerIcp | null
    if (!icpCriteria) return

    const scorer = new IcpScoringService()
    const newScore = await scorer.scoreCustomer({
      enrichment: {
        employee_count: enrichment.employee_count || '',
        about: enrichment.about || '',
        industry: enrichment.industry || '',
        specialties: enrichment.specialties || [],
      },
      icpCriteria,
      companyName: customer.name,
    })

    const currentScore = customer.info?.icp_score
    if (newScore !== currentScore) {
      const service = new CustomerService(supabase)
      await service.updateIcpScore(customer.id, newScore)
      logger.info('[CustomerController] ICP auto-rescored after info update', {
        previousScore: currentScore ?? 'none',
        newScore,
      })
    }
  } catch (error) {
    logger.error('[CustomerController] ICP auto-rescore failed', {
      sourceCode: 'rescoreIcpIfNeeded',
      error: error instanceof Error ? error : new Error(String(error)),
    })
  }
}

/**
 * Sync team members from LinkedIn for a customer (reusable helper).
 * Used by both the manual sync endpoint and auto-triggers.
 * Returns the sync result or null if customer/URL is invalid.
 * @internal Exported for unit testing only.
 */
export async function syncTeamForCustomer(customerId: string): Promise<{ added: number; removed: number } | null> {
  const supabase = getSupabase()
  const service = new CustomerService(supabase)
  const customer = await service.getById(customerId)

  if (!customer) return null

  const linkedinUrl = customer.info?.linkedin_company_url
  if (!linkedinUrl) return null

  const slug = EnrichmentService.extractCompanySlug(linkedinUrl)
  if (!slug) return null

  const enrichmentService = new EnrichmentService()
  const scrapedPeople = await enrichmentService.scrapeLinkedInPeople(slug)

  if (scrapedPeople.length === 0) {
    // Don't clear enrichment_errors on empty result — could be a silent scraper failure.
    // Errors are only cleared on confirmed success (actual results below).
    return { added: 0, removed: 0 }
  }

  // Load role filters (RLS-scoped, falls back to defaults)
  const { data: filterRow } = await supabase
    .from('team_role_filters')
    .select('roles, exclusions')
    .maybeSingle()

  const roleFilters: TeamRoleFilter[] = filterRow?.roles?.length
    ? filterRow.roles
    : DEFAULT_ROLE_FILTERS
  const exclusions: string[] = filterRow?.exclusions?.length
    ? filterRow.exclusions
    : DEFAULT_ROLE_EXCLUSIONS

  const filtered = await enrichmentService.filterTeamByRoles(scrapedPeople, roleFilters, exclusions)
  const result = mergeTeamMembers(customer.info?.team || [], filtered)

  await service.mergeInfo(customerId, {
    team: result.mergedTeam,
    enrichment_errors: { ...customer.info?.enrichment_errors, linkedin: undefined },
  })

  logger.info('[CustomerController] Team sync complete', {
    companyName: customer.name,
    scraped: scrapedPeople.length,
    filtered: filtered.length,
    added: result.added,
    removed: result.removed,
  })

  return { added: result.added, removed: result.removed }
}

/**
 * Enrich and ICP-score a newly created customer (fire-and-forget).
 * Calls EnrichmentService for company data, then IcpScoringService.
 */
async function enrichAndScoreNewCustomer(customer: Customer): Promise<void> {
  try {
    if (!customer.name) return

    logger.info('[CustomerController] Post-create enrichment started', {
      companyName: customer.name,
      hasLinkedinUrl: !!customer.info?.linkedin_company_url,
      hasIndustryHint: !!(customer.info?.vertical || customer.info?.product?.category),
    })

    // --- Enrichment ---
    const enrichmentService = new EnrichmentService()
    const linkedinUrl = customer.info?.linkedin_company_url
    const industryHint = customer.info?.vertical || customer.info?.product?.category || undefined
    const websiteUrl = customer.info?.website_url || undefined
    const enrichResult = await enrichmentService.enrichCompany(customer.name, linkedinUrl, industryHint, websiteUrl)

    if (!enrichResult) {
      logger.info('[CustomerController] Post-create enrichment returned no data', {
        companyName: customer.name,
      })
      return
    }

    const supabase = getSupabase()
    const service = new CustomerService(supabase)
    await service.updateEnrichment(customer.id, enrichResult.data, enrichResult.source)

    logger.info('[CustomerController] Post-create enrichment saved', {
      companyName: customer.name,
      source: enrichResult.source,
      hasIndustry: !!enrichResult.data.industry,
    })

    // --- Team Extraction ---
    // Re-fetch to get latest data (enrichment may have populated linkedin_company_url)
    try {
      const latestCustomer = await service.getById(customer.id)
      if (latestCustomer?.info?.linkedin_company_url) {
        await syncTeamForCustomer(customer.id)
        logger.info('[CustomerController] Post-create team extraction complete', {
          companyName: customer.name,
        })
      }
    } catch (teamError) {
      logger.error('[CustomerController] Post-create team extraction failed', {
        sourceCode: 'enrichAndScoreNewCustomer.teamExtraction',
        error: teamError instanceof Error ? teamError.message : String(teamError),
      })
      // Best-effort: persist error for UI display (preserve existing errors)
      try {
        const current = await service.getById(customer.id)
        await service.mergeInfo(customer.id, {
          enrichment_errors: {
            ...current?.info?.enrichment_errors,
            linkedin: 'Failed to extract team from LinkedIn',
          },
        })
      } catch { /* best-effort */ }
    }

    // --- ICP Scoring ---
    // Skip if user already set a manual score at creation time
    if (customer.info?.icp_score) {
      logger.info('[CustomerController] Skipping auto-score — user set ICP manually', {
        companyName: customer.name,
        existingScore: customer.info.icp_score,
      })
      return
    }

    if (!enrichResult.data.industry) return

    const { data: userCtxRow } = await supabase
      .from('user_context')
      .select('customers')
      .limit(1)
      .maybeSingle()

    const icpCriteria = userCtxRow?.customers as CustomerIcp | null
    if (!icpCriteria) return

    const scorer = new IcpScoringService()
    const score = await scorer.scoreCustomer({
      enrichment: {
        employee_count: enrichResult.data.employee_count || '',
        about: enrichResult.data.about || '',
        industry: enrichResult.data.industry || '',
        specialties: enrichResult.data.specialties || [],
      },
      icpCriteria,
      companyName: customer.name,
    })

    await service.updateIcpScore(customer.id, score)

    logger.info('[CustomerController] Post-create ICP scoring complete', {
      companyName: customer.name,
      score,
    })
  } catch (error) {
    logger.error('[CustomerController] Post-create enrichment+scoring failed', {
      sourceCode: 'enrichAndScoreNewCustomer',
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Merge scraped LinkedIn team members with existing team.
 * Rules:
 * - Never modify or remove members with source='manual' (or no source)
 * - Add new linkedin_scrape members not already present (match by name, case-insensitive)
 * - Soft-delete (hidden=true) existing linkedin_scrape members not in latest scrape
 */
/** @internal Exported for unit testing only */
export function mergeTeamMembers(
  existingTeam: TeamMember[],
  scrapedMembers: Array<{ name: string; role: string; linkedin_url?: string }>,
): { mergedTeam: TeamMember[]; added: number; removed: number } {
  const result = [...existingTeam.map(m => ({ ...m }))]
  let added = 0
  let removed = 0

  const scrapedNameSet = new Set(scrapedMembers.map(m => m.name.toLowerCase()))

  // Soft-delete stale linkedin_scrape members
  for (const member of result) {
    if (member.source === 'linkedin_scrape' && !member.hidden) {
      if (!scrapedNameSet.has(member.name.toLowerCase())) {
        member.hidden = true
        removed++
      }
    }
  }

  // Un-hide previously hidden linkedin_scrape members that are back in the scrape
  for (const member of result) {
    if (member.source === 'linkedin_scrape' && member.hidden) {
      if (scrapedNameSet.has(member.name.toLowerCase())) {
        member.hidden = false
        const scraped = scrapedMembers.find(s => s.name.toLowerCase() === member.name.toLowerCase())
        if (scraped) {
          member.role = scraped.role
          if (scraped.linkedin_url) member.linkedin_url = scraped.linkedin_url
        }
      }
    }
  }

  // Add new members not already in team
  const existingNameSet = new Set(result.map(m => m.name.toLowerCase()))
  for (const scraped of scrapedMembers) {
    if (!existingNameSet.has(scraped.name.toLowerCase())) {
      result.push({
        name: scraped.name,
        role: scraped.role,
        linkedin_url: scraped.linkedin_url,
        source: 'linkedin_scrape',
      })
      added++
    }
  }

  return { mergedTeam: result, added, removed }
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * GET /api/customers
 * List all customers for authenticated user.
 */
export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const status = req.query.status as string | undefined
    const search = req.query.search as string | undefined
    const sort = req.query.sort as string | undefined
    const icp = req.query.icp as string | undefined

    // Validate status if provided
    if (status && !VALID_CUSTOMER_STATUSES.includes(status as any)) {
      res.status(400).json({
        error: 'Validation error',
        message: `status must be one of: ${VALID_CUSTOMER_STATUSES.join(', ')}`,
      })
      return
    }

    const service = getService(req)
    const summary = req.query.summary === 'true'

    if (summary) {
      const customers = await service.listWithSummary({ status: status as any, search, sort, icp })
      res.status(200).json({ customers, count: customers.length })
    } else {
      const customers = await service.list({ status: status as any, search, sort })
      res.status(200).json({ customers, count: customers.length })
    }
  } catch (error) {
    logger.error('[CustomerController] Error in listCustomers', {
      sourceCode: 'listCustomers',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/:id
 * Get single customer with tab counts.
 */
export const getCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const service = getService(req)
    const customer = await service.getById(id)

    if (!customer) {
      res.status(404).json({ error: 'Not found', message: 'Customer not found' })
      return
    }

    res.status(200).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in getCustomer', {
      sourceCode: 'getCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers
 * Create a new customer.
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const parsed = createCustomerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    logger.info('[CustomerController] Creating customer', {
      hasUserId: true,
      hasStatus: !!parsed.data.status,
      hasInfo: !!parsed.data.info,
    })

    const service = getService(req)
    const customer = await service.create(userId, parsed.data)

    // Fire-and-forget: enrich company data + ICP score in background
    enrichAndScoreNewCustomer(customer).catch(() => {})

    res.status(201).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in createCustomer', {
      sourceCode: 'createCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/enrich-from-linkedin
 * Enrich from a LinkedIn URL (company or person page).
 */
export const enrichFromLinkedIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const schema = z.object({
      linkedin_url: z.string().url().refine(
        (url) => url.includes('linkedin.com/company/') || url.includes('linkedin.com/in/'),
        'Must be a LinkedIn company or person URL'
      ),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() })
      return
    }

    const enrichmentService = new EnrichmentService()
    const result = await enrichmentService.enrichFromLinkedInUrl(parsed.data.linkedin_url)

    if (!result) {
      res.status(200).json({ enriched: false, message: 'Could not extract data from this URL' })
      return
    }

    res.status(200).json({ enriched: true, ...result })
  } catch (error) {
    logger.error('[CustomerController] Error in enrichFromLinkedIn', {
      sourceCode: 'enrichFromLinkedIn',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /api/customers/enrich-from-website
 * Enrich from a company website URL.
 */
export const enrichFromWebsite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const schema = z.object({
      website_url: z.string().url('Must be a valid URL'),
    })

    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() })
      return
    }

    const enrichmentService = new EnrichmentService()
    const result = await enrichmentService.enrichFromWebsiteUrl(parsed.data.website_url)

    if (!result) {
      res.status(200).json({ enriched: false, message: 'Could not extract data from this URL' })
      return
    }

    res.status(200).json({ enriched: true, ...result })
  } catch (error) {
    logger.error('[CustomerController] Error in enrichFromWebsite', {
      sourceCode: 'enrichFromWebsite',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/customers/:id
 * Update customer (partial update).
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = updateCustomerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    if (Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: 'Validation error', message: 'No updates provided' })
      return
    }

    logger.info('[CustomerController] Updating customer', {
      hasCustomerId: true,
      updateFields: Object.keys(parsed.data),
    })

    const service = getService(req)

    // Snapshot old URLs before update so we can detect changes
    let oldWebsiteUrl: string | undefined
    let oldLinkedinUrl: string | undefined
    if (parsed.data.info) {
      const existing = await service.getById(id)
      oldWebsiteUrl = existing?.info?.website_url || undefined
      oldLinkedinUrl = existing?.info?.linkedin_company_url || undefined
    }

    const customer = await service.update(id, parsed.data)

    // Auto-rescore ICP if info was updated (fire-and-forget, non-blocking)
    if (parsed.data.info) {
      rescoreIcpIfNeeded(customer).catch(() => {})
    }

    // Auto-extract team when LinkedIn URL exists after update (fire-and-forget).
    // Merge is idempotent so re-syncing an unchanged URL is harmless.
    if (parsed.data.info && customer.info?.linkedin_company_url
        && EnrichmentService.extractCompanySlug(customer.info.linkedin_company_url)) {
      syncTeamForCustomer(customer.id).catch((err) => {
        logger.error('[CustomerController] Auto team sync after URL update failed', {
          sourceCode: 'updateCustomer.teamSync',
          error: err instanceof Error ? err.message : String(err),
        })
      })
    }

    // Auto-enrich when website_url or linkedin_company_url was added/changed (fire-and-forget)
    if (parsed.data.info) {
      const newWebsiteUrl = customer.info?.website_url
      const newLinkedinUrl = customer.info?.linkedin_company_url
      const websiteChanged = newWebsiteUrl && newWebsiteUrl !== oldWebsiteUrl
      const linkedinChanged = newLinkedinUrl && newLinkedinUrl !== oldLinkedinUrl

      if (websiteChanged || linkedinChanged) {
        logger.info('[CustomerController] URL changed on update — triggering enrichment', {
          hasWebsiteChanged: !!websiteChanged,
          hasLinkedinChanged: !!linkedinChanged,
        })
        enrichAndScoreNewCustomer(customer).catch(() => {})
      }
    }

    res.status(200).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in updateCustomer', {
      sourceCode: 'updateCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * PATCH /api/customers/:id/status
 * Quick status update.
 */
export const updateCustomerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = updateStatusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: `status must be one of: ${VALID_CUSTOMER_STATUSES.join(', ')}`,
      })
      return
    }

    logger.info('[CustomerController] Updating customer status', {
      hasCustomerId: true,
      newStatus: parsed.data.status,
    })

    const service = getService(req)
    const customer = await service.updateStatus(id, parsed.data.status)

    res.status(200).json(customer)
  } catch (error) {
    logger.error('[CustomerController] Error in updateCustomerStatus', {
      sourceCode: 'updateCustomerStatus',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * DELETE /api/customers/:id
 * Soft delete customer.
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    logger.info('[CustomerController] Deleting customer (soft)', {
      hasCustomerId: true,
    })

    const service = getService(req)
    await service.delete(id)

    res.status(200).json({ message: 'Customer archived successfully' })
  } catch (error) {
    logger.error('[CustomerController] Error in deleteCustomer', {
      sourceCode: 'deleteCustomer',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

// =============================================================================
// Search, Stats, and Artifact Search (Phase 5)
// =============================================================================

/**
 * GET /api/customers/search?q=...
 * Full-text search across customers.
 */
export const searchCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const q = (req.query.q as string || '').trim()
    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Validation error', message: 'Search query must be at least 2 characters' })
      return
    }

    const service = getService(req)
    const customers = await service.search(q)

    res.status(200).json({ customers, count: customers.length })
  } catch (error) {
    logger.error('[CustomerController] Error in searchCustomers', {
      sourceCode: 'searchCustomers',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/stats
 * Dashboard stats across all customers.
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const service = getService(req)
    const stats = await service.getDashboardStats()

    res.status(200).json(stats)
  } catch (error) {
    logger.error('[CustomerController] Error in getDashboardStats', {
      sourceCode: 'getDashboardStats',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * GET /api/customers/documents/search?q=...
 * Search customer documents by title for cross-module linking.
 */
export const searchDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const q = (req.query.q as string || '').trim()
    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Validation error', message: 'Search query must be at least 2 characters' })
      return
    }

    const query = q.slice(0, 200)

    const service = getService(req)
    const documents = await service.searchDocuments(query)

    res.status(200).json({ documents, count: documents.length })
  } catch (error) {
    logger.error('[CustomerController] Error in searchDocuments', {
      sourceCode: 'searchDocuments',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

// =============================================================================
// Customer Events
// =============================================================================

/**
 * GET /api/customers/:id/events
 * List events for a customer.
 */
export const listCustomerEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const service = getService(req)
    const events = await service.listEvents(id)

    res.status(200).json({ events, count: events.length })
  } catch (error) {
    logger.error('[CustomerController] Error in listCustomerEvents', {
      sourceCode: 'listCustomerEvents',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

/**
 * POST /api/customers/:id/events
 * Create a new event for a customer.
 */
export const createCustomerEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    if (!id) {
      res.status(400).json({ error: 'Missing ID', message: 'Customer ID is required' })
      return
    }

    const parsed = createEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: 'Validation error',
        message: parsed.error.errors.map(e => e.message).join(', '),
      })
      return
    }

    const service = getService(req)
    const event = await service.createEvent(id, parsed.data)

    res.status(201).json(event)
  } catch (error) {
    logger.error('[CustomerController] Error in createCustomerEvent', {
      sourceCode: 'createCustomerEvent',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
}

// =============================================================================
// LinkedIn Team Sync
// =============================================================================

/**
 * POST /api/customers/:id/sync-team-from-linkedin
 * Sync team members from LinkedIn People page.
 */
export const syncTeamFromLinkedIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User ID not found in request' })
      return
    }

    const id = req.params.id as string
    const service = getService(req)
    const customer = await service.getById(id)

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' })
      return
    }

    if (!customer.info?.linkedin_company_url) {
      res.status(400).json({ error: 'Customer has no LinkedIn company URL' })
      return
    }

    const slug = EnrichmentService.extractCompanySlug(customer.info.linkedin_company_url)
    if (!slug) {
      res.status(400).json({ error: 'Invalid LinkedIn company URL format' })
      return
    }

    const result = await syncTeamForCustomer(id)

    if (!result) {
      res.status(500).json({ error: 'Failed to sync team from LinkedIn' })
      return
    }

    // Re-fetch to return updated team
    const updated = await service.getById(id)
    const visibleTeam = (updated?.info?.team || []).filter(m => !m.hidden)

    res.json({
      added: result.added,
      removed: result.removed,
      total: visibleTeam.length,
      members: visibleTeam,
    })
  } catch (error) {
    logger.error('[CustomerController] Team sync failed', {
      hasError: true,
      sourceCode: 'syncTeamFromLinkedIn',
    })

    // Save error to enrichment_errors for UI display
    try {
      const id = req.params.id as string
      const service = getService(req)
      const customer = await service.getById(id)
      if (customer) {
        await service.mergeInfo(id, {
          enrichment_errors: {
            ...customer.info?.enrichment_errors,
            linkedin: 'Failed to sync team from LinkedIn',
          },
        })
      }
    } catch { /* best-effort error persistence */ }

    res.status(500).json({ error: 'Failed to sync team from LinkedIn' })
  }
}
