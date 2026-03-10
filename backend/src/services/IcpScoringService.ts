/**
 * IcpScoringService
 *
 * Hybrid ICP scoring engine: quantitative formula + qualitative LLM.
 * Produces a composite score mapped to Low/Medium/High/Very High.
 *
 * Quantitative scoring (25%, no LLM cost):
 *   - Employee count match (binary in-range check)
 *
 * Qualitative scoring (75%, claude-haiku):
 *   - 5-dimension LLM evaluation:
 *     ideal client fit (25%), company stage (20%), service need (15%),
 *     business model (10%), industry alignment (5%)
 *   - Receives full ICP criteria + full enrichment data
 *
 * Composite = quantitative * 0.25 + qualitative * 0.75
 */

import fs from 'fs'
import path from 'path'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from '../lib/logger.js'
import type { IcpScore, CustomerIcp } from '../types/customer.js'
import type { CompanyEnrichmentData } from './EnrichmentService.js'

// =============================================================================
// Dedicated ICP Scoring Log (persists across restarts, one JSON record per line)
// =============================================================================

const ICP_LOG_DIR = path.join(process.cwd(), 'logs')
const ICP_LOG_FILE = path.join(ICP_LOG_DIR, 'icp-scoring.jsonl')

if (!fs.existsSync(ICP_LOG_DIR)) {
  fs.mkdirSync(ICP_LOG_DIR, { recursive: true })
}

const icpLogStream = fs.createWriteStream(ICP_LOG_FILE, { flags: 'a' })

interface IcpScoringLogEntry {
  timestamp: string
  company: string
  // Customer enrichment data used
  enrichment: {
    employee_count: string
    industry: string
    specialties: string[]
    about_length: number
    about_preview: string
  }
  // ICP criteria from user_context.customers
  criteria: {
    ideal_client_length: number
    ideal_client_preview: string
    company_stage: string[]
    target_employee_min: number | null
    target_employee_max: number | null
    industry_verticals: string[]
  }
  // Factor-by-factor decisions
  factors: {
    employee: {
      status: 'scored' | 'skipped' | 'unparseable'
      raw_value: string
      parsed_midpoint: number | null
      target_range: string
      in_range: boolean | null
      score: number
    }
    qualitative: {
      status: 'scored' | 'skipped'
      reason_if_skipped: string | null
      llm_raw_response: string | null
      llm_parsed_score: number | null
      normalized_score: number
    }
  }
  // Final calculation
  calculation: {
    quantitative_score: number
    quantitative_formula: string
    qualitative_score: number
    composite_formula: string
    composite_score: number
    weights: string
    thresholds: string
  }
  result: IcpScore
}

function writeIcpLog(entry: IcpScoringLogEntry) {
  icpLogStream.write(JSON.stringify(entry) + '\n')
}

// =============================================================================
// Constants
// =============================================================================

const SCORING_MODEL = 'claude-haiku-4-5-20251001'

// System-level scoring weights:
// 25% quantitative (employee count), 75% qualitative LLM
const SYSTEM_WEIGHT_QUANTITATIVE = 25

// Score thresholds
const THRESHOLD_VERY_HIGH = 0.75
const THRESHOLD_HIGH = 0.5
const THRESHOLD_MEDIUM = 0.25

const TAG = '[IcpScoring]'

// =============================================================================
// Types
// =============================================================================

interface ScoringInput {
  enrichment: CompanyEnrichmentData
  icpCriteria: CustomerIcp
  companyName?: string
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse LinkedIn-style employee count range to a midpoint number.
 * Examples: "51-200" → 125, "1001-5000" → 3000, "500+" → 500, "50" → 50
 */
function parseEmployeeCount(raw: string): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[,\s]/g, '')

  // Range: "51-200"
  const rangeMatch = cleaned.match(/^(\d+)\s*[-–]\s*(\d+)$/)
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1], 10)
    const high = parseInt(rangeMatch[2], 10)
    return Math.round((low + high) / 2)
  }

  // Plus: "500+"
  const plusMatch = cleaned.match(/^(\d+)\+$/)
  if (plusMatch) {
    return parseInt(plusMatch[1], 10)
  }

  // Bare number: "50"
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

/**
 * Score employee count match. Returns score + log details.
 */
interface EmployeeScoreResult {
  score: number
  status: 'scored' | 'skipped' | 'unparseable'
  parsedMidpoint: number | null
  targetRange: string
  inRange: boolean | null
}

function scoreEmployeeCount(
  enrichmentCount: string,
  min: number | null | undefined,
  max: number | null | undefined,
  label: string,
): EmployeeScoreResult {
  if (min == null && max == null) {
    logger.info(`${TAG} ${label} | Employee count: SKIPPED (no min/max criteria configured)`)
    return { score: -1, status: 'skipped', parsedMidpoint: null, targetRange: 'N/A', inRange: null }
  }

  const effectiveMin = min ?? 0
  const effectiveMax = max ?? Number.MAX_SAFE_INTEGER
  const rangeStr = `${effectiveMin}-${max == null ? '∞' : effectiveMax}`

  const midpoint = parseEmployeeCount(enrichmentCount)
  if (midpoint === null) {
    logger.info(`${TAG} ${label} | Employee count: 0.0 (could not parse "${enrichmentCount}")`)
    return { score: 0, status: 'unparseable', parsedMidpoint: null, targetRange: rangeStr, inRange: null }
  }

  const inRange = midpoint >= effectiveMin && midpoint <= effectiveMax
  const score = inRange ? 1.0 : 0.0

  logger.info(`${TAG} ${label} | Employee count: ${score}`, {
    raw: enrichmentCount,
    parsedMidpoint: midpoint,
    targetRange: rangeStr,
    inRange,
  })

  return { score, status: 'scored', parsedMidpoint: midpoint, targetRange: rangeStr, inRange }
}

/**
 * Calculate quantitative score from employee count match.
 * Employee-only: returns 0 or 1 (binary in-range check).
 * Returns 0.5 (neutral) if no employee criteria configured.
 */
interface QuantitativeResult {
  score: number
  formula: string
  employee: EmployeeScoreResult
}

function calculateQuantitativeScore(
  enrichment: CompanyEnrichmentData,
  criteria: CustomerIcp,
  label: string,
): QuantitativeResult {
  const employee = scoreEmployeeCount(
    enrichment.employee_count,
    criteria.target_employee_min,
    criteria.target_employee_max,
    label,
  )

  if (employee.score < 0) {
    logger.info(`${TAG} ${label} | Quantitative score: 0.50 (no employee criteria, returning neutral)`)
    return { score: 0.5, formula: '0.50 (no employee criteria, neutral)', employee }
  }

  const formula = `employee=${employee.score.toFixed(2)}`

  logger.info(`${TAG} ${label} | Quantitative score: ${employee.score.toFixed(3)}`, {
    formula,
  })

  return { score: employee.score, formula, employee }
}

/**
 * Map numeric score (0-1) to ICP level.
 */
function mapToIcpScore(score: number): IcpScore {
  if (score >= THRESHOLD_VERY_HIGH) return 'very_high'
  if (score >= THRESHOLD_HIGH) return 'high'
  if (score >= THRESHOLD_MEDIUM) return 'medium'
  return 'low'
}

/**
 * Build the qualitative scoring prompt with full ICP criteria and enrichment data.
 */
function buildQualitativePrompt(
  enrichment: CompanyEnrichmentData,
  criteria: CustomerIcp,
): { system: string; user: string } {
  const system = `You are an ICP (Ideal Customer Profile) scoring engine. You evaluate how well a company matches a consultant's ideal customer profile.

You score on 5 dimensions, each weighted differently. For each dimension, assign a score from 0 to 100.

Note: Company size (number of employees) is scored separately and is NOT part of your evaluation. Focus only on the 5 dimensions below.

## Scoring Dimensions

### 1. Ideal Client Fit (25/75 = 33.3% of your score)
How well does the company match the consultant's ideal client description?
Consider: company type, needs, pain points, and whether this company would realistically hire this type of consultant.
- 80-100: Almost exact match to ideal client description
- 60-79: Strong alignment on most criteria
- 40-59: Partial match — some criteria align, others don't
- 20-39: Weak match — mostly misaligned
- 0-19: No meaningful match

### 2. Company Stage & Scale (20/75 = 26.7% of your score)
Does the company's maturity and scale match the target company stages?
Consider funding stage signals, corporate structure, and whether the company feels like the right stage.
A 10,000-person public company is not "Early Stage" even if it was once a startup.
A subsidiary of a large corporation is not a startup.
- 80-100: Clear match to target stage(s)
- 60-79: Likely match or adjacent stage
- 40-59: Unclear but possible
- 20-39: Likely too early or too late
- 0-19: Clearly wrong stage (e.g., massive enterprise vs. seed-stage target)

### 3. Service Need Signal (15/75 = 20.0% of your score)
Based on the company description, how likely is it that this company needs the consultant's services?
Consider: Is the company at a stage where they'd hire a fractional/advisory consultant? Do they show signs of needing the expertise offered? Would they benefit from the consultant's specific skills?
- 80-100: Strong signals of needing this service
- 60-79: Moderate signals
- 40-59: Possible but unclear
- 20-39: Unlikely to need this service
- 0-19: No signal or clearly doesn't need it

### 4. Business Model Match (10/75 = 13.3% of your score)
Is the company's business model aligned with what the consultant specializes in?
Consider: B2B vs B2C, SaaS vs services vs hardware, product-led vs sales-led, etc.
- 80-100: Exact business model match
- 60-79: Similar business model
- 40-59: Some overlap
- 20-39: Different model with minor overlap
- 0-19: Completely different business model

### 5. Industry & Vertical Alignment (5/75 = 6.7% of your score)
Does the company operate in or closely adjacent to the target industry verticals?
IMPORTANT: Use contextual/semantic matching, NOT literal string matching.
For example: "Software Development" is contextually aligned with "saas" and "b2b". "Financial Services" is contextually aligned with "fintech". A design agency is NOT aligned with "saas" even if they serve tech clients.
Consider the company's specialties and what they actually do, not just their industry label.
- 80-100: Direct match to a target vertical
- 60-79: Closely adjacent or overlapping vertical
- 40-59: Tangentially related
- 20-39: Weakly related
- 0-19: Unrelated industry

## Output Format

Return ONLY a single integer 0-100 representing the weighted composite score. No explanation, no breakdown, just the number.

Calculate: (dim1 * 25/75) + (dim2 * 20/75) + (dim3 * 15/75) + (dim4 * 10/75) + (dim5 * 5/75) = weighted score, then round to nearest integer.`

  // Build the user prompt with all available data
  const industryVerticals = criteria.industry_verticals?.length
    ? criteria.industry_verticals.join(', ')
    : '(not specified)'

  const companyStages = criteria.company_stage?.length
    ? criteria.company_stage.join(', ')
    : '(not specified)'

  const employeeRange = (criteria.target_employee_min != null || criteria.target_employee_max != null)
    ? `${criteria.target_employee_min ?? 'any'} - ${criteria.target_employee_max ?? 'any'}`
    : '(not specified)'

  const specialties = enrichment.specialties?.length
    ? enrichment.specialties.join(', ')
    : '(none available)'

  const user = `## Consultant's ICP Criteria

**Ideal Client Description:**
${criteria.ideal_client || '(not provided)'}

**Target Industry Verticals:** ${industryVerticals}
**Target Company Stages:** ${companyStages}
**Target Employee Range:** ${employeeRange}

## Company Being Evaluated

**Industry:** ${enrichment.industry || '(unknown)'}
**Employee Count:** ${enrichment.employee_count || '(unknown)'}
**Specialties:** ${specialties}

**Company Description:**
${enrichment.about || '(no description available)'}

## Score (0-100):`

  return { system, user }
}

// =============================================================================
// Service
// =============================================================================

export class IcpScoringService {
  /**
   * Calculate qualitative score using LLM with full ICP criteria.
   * Returns normalized score + LLM details for logging.
   */
  private async calculateQualitativeScore(
    enrichment: CompanyEnrichmentData,
    criteria: CustomerIcp,
    label: string,
  ): Promise<{ normalized: number; rawResponse: string | null; parsedScore: number | null }> {
    const hasDescription = !!criteria.ideal_client
    const hasAbout = !!enrichment.about

    if (!hasDescription && !hasAbout) {
      logger.info(`${TAG} ${label} | Qualitative score: 0.50 (skipped — no ideal_client and no company about)`, {
        hasCompanyAbout: hasAbout,
        hasIcpDescription: hasDescription,
      })
      return { normalized: 0.5, rawResponse: null, parsedScore: null }
    }

    logger.info(`${TAG} ${label} | Qualitative scoring: calling LLM`, {
      hasCompanyAbout: hasAbout,
      hasIcpDescription: hasDescription,
      companyAboutLength: enrichment.about?.length ?? 0,
      idealClientLength: criteria.ideal_client?.length ?? 0,
      industryVerticals: criteria.industry_verticals ?? [],
      companyStages: criteria.company_stage ?? [],
      model: SCORING_MODEL,
    })

    try {
      const { system, user } = buildQualitativePrompt(enrichment, criteria)

      const { text } = await generateText({
        model: anthropic(SCORING_MODEL),
        system,
        prompt: user,
        maxOutputTokens: 10,
      })

      // Strip markdown fences if present
      let scoreText = text.trim()
      const fenceMatch = scoreText.match(/```(?:\w+)?\s*([\s\S]*?)```/)
      if (fenceMatch) scoreText = fenceMatch[1].trim()

      const score = parseInt(scoreText, 10)

      if (isNaN(score) || score < 0 || score > 100) {
        logger.warn(`${TAG} ${label} | Qualitative score: 0.50 (LLM returned unparseable value)`, {
          rawResponse: text,
          parsedAttempt: scoreText,
        })
        return { normalized: 0.5, rawResponse: text, parsedScore: null }
      }

      logger.info(`${TAG} ${label} | Qualitative score: ${(score / 100).toFixed(2)} (LLM raw: ${score}/100)`, {
        rawResponse: text,
        parsedScore: score,
        normalized: score / 100,
      })

      return { normalized: score / 100, rawResponse: text, parsedScore: score }
    } catch (error) {
      logger.error(`${TAG} ${label} | Qualitative score: FAILED (LLM error, falling back to 0.50)`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return { normalized: 0.5, rawResponse: `ERROR: ${error instanceof Error ? error.message : String(error)}`, parsedScore: null }
    }
  }

  /**
   * Score a customer against ICP criteria from user_context.customers.
   */
  async scoreCustomer(input: ScoringInput): Promise<IcpScore> {
    const { enrichment, icpCriteria, companyName } = input
    const label = companyName ?? 'unknown'

    logger.info(`${TAG} ${label} | === SCORING STARTED ===`)

    logger.info(`${TAG} ${label} | Enrichment data`, {
      employeeCount: enrichment.employee_count || '(empty)',
      industry: enrichment.industry || '(empty)',
      specialtiesCount: enrichment.specialties?.length ?? 0,
      hasAbout: !!enrichment.about,
      aboutLength: enrichment.about?.length ?? 0,
    })

    logger.info(`${TAG} ${label} | ICP criteria`, {
      employeeRange: `${icpCriteria.target_employee_min ?? '∞'} - ${icpCriteria.target_employee_max ?? '∞'}`,
      industryVerticals: icpCriteria.industry_verticals ?? [],
      companyStages: icpCriteria.company_stage ?? [],
      hasIdealClient: !!icpCriteria.ideal_client,
      idealClientLength: icpCriteria.ideal_client?.length ?? 0,
    })

    // --- Quantitative (employee count only) ---
    const quant = calculateQuantitativeScore(enrichment, icpCriteria, label)

    // --- Qualitative (LLM with full criteria) ---
    const hasQualitative = !!icpCriteria.ideal_client || !!enrichment.about
    const qualResult = hasQualitative
      ? await this.calculateQualitativeScore(enrichment, icpCriteria, label)
      : { normalized: 0.5, rawResponse: null, parsedScore: null }

    if (!hasQualitative) {
      logger.info(`${TAG} ${label} | Qualitative scoring: SKIPPED (no ideal_client and no company about)`, {
        hasIdealClient: !!icpCriteria.ideal_client,
        hasCompanyAbout: !!enrichment.about,
      })
    }

    // --- Composite ---
    const composite = hasQualitative
      ? quant.score * (SYSTEM_WEIGHT_QUANTITATIVE / 100) + qualResult.normalized * ((100 - SYSTEM_WEIGHT_QUANTITATIVE) / 100)
      : quant.score // 100% quantitative if no qualitative inputs

    const score = mapToIcpScore(composite)

    const weightsStr = hasQualitative
      ? `quantitative=${SYSTEM_WEIGHT_QUANTITATIVE}% / qualitative=${100 - SYSTEM_WEIGHT_QUANTITATIVE}%`
      : 'quantitative=100% (qualitative N/A)'

    const compositeFormula = hasQualitative
      ? `${quant.score.toFixed(3)} * ${SYSTEM_WEIGHT_QUANTITATIVE / 100} + ${qualResult.normalized.toFixed(3)} * ${(100 - SYSTEM_WEIGHT_QUANTITATIVE) / 100} = ${composite.toFixed(3)}`
      : `${quant.score.toFixed(3)} (100% quantitative, no qualitative)`

    const thresholdsStr = `very_high>=${THRESHOLD_VERY_HIGH * 100} | high>=${THRESHOLD_HIGH * 100} | medium>=${THRESHOLD_MEDIUM * 100} | low<${THRESHOLD_MEDIUM * 100}`

    logger.info(`${TAG} ${label} | === SCORING COMPLETE ===`, {
      quantitativeScore: Math.round(quant.score * 100),
      qualitativeScore: hasQualitative ? Math.round(qualResult.normalized * 100) : 'skipped',
      compositeScore: Math.round(composite * 100),
      compositeFormula,
      weights: weightsStr,
      thresholds: thresholdsStr,
      result: score,
    })

    // --- Write structured log entry to dedicated ICP scoring file ---
    const logEntry: IcpScoringLogEntry = {
      timestamp: new Date().toISOString(),
      company: label,
      enrichment: {
        employee_count: enrichment.employee_count || '',
        industry: enrichment.industry || '',
        specialties: enrichment.specialties ?? [],
        about_length: enrichment.about?.length ?? 0,
        about_preview: (enrichment.about ?? '').slice(0, 200),
      },
      criteria: {
        ideal_client_length: icpCriteria.ideal_client?.length ?? 0,
        ideal_client_preview: (icpCriteria.ideal_client ?? '').slice(0, 200),
        company_stage: icpCriteria.company_stage ?? [],
        target_employee_min: icpCriteria.target_employee_min ?? null,
        target_employee_max: icpCriteria.target_employee_max ?? null,
        industry_verticals: icpCriteria.industry_verticals ?? [],
      },
      factors: {
        employee: {
          status: quant.employee.status,
          raw_value: enrichment.employee_count || '',
          parsed_midpoint: quant.employee.parsedMidpoint,
          target_range: quant.employee.targetRange,
          in_range: quant.employee.inRange,
          score: quant.employee.score,
        },
        qualitative: {
          status: hasQualitative ? 'scored' : 'skipped',
          reason_if_skipped: hasQualitative ? null : 'no ideal_client and no company about',
          llm_raw_response: qualResult.rawResponse,
          llm_parsed_score: qualResult.parsedScore,
          normalized_score: qualResult.normalized,
        },
      },
      calculation: {
        quantitative_score: quant.score,
        quantitative_formula: quant.formula,
        qualitative_score: qualResult.normalized,
        composite_formula: compositeFormula,
        composite_score: composite,
        weights: weightsStr,
        thresholds: thresholdsStr,
      },
      result: score,
    }

    writeIcpLog(logEntry)

    return score
  }
}
