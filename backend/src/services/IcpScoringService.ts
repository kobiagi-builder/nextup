/**
 * IcpScoringService
 *
 * Hybrid ICP scoring engine: quantitative formula + qualitative LLM.
 * Produces a composite score mapped to Low/Medium/High/Very High.
 *
 * Quantitative scoring (no LLM cost):
 *   - Employee count match (40%)
 *   - Industry match (35%)
 *   - Specialties overlap (25%)
 *
 * Qualitative scoring (claude-haiku):
 *   - Company about vs user's ICP description
 *   - Only runs if both exist
 *
 * Composite = quantitative * (weight/100) + qualitative * ((100-weight)/100)
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from '../lib/logger.js'
import type { IcpScore, IcpSettings } from '../types/customer.js'
import type { CompanyEnrichmentData } from './EnrichmentService.js'

// =============================================================================
// Constants
// =============================================================================

const SCORING_MODEL = 'claude-haiku-4-5-20251001'

// System-level scoring weights (not per-account):
// 40% quantitative formula, 60% qualitative LLM
const SYSTEM_WEIGHT_QUANTITATIVE = 40

// Quantitative dimension weights (must sum to 1.0)
const WEIGHT_EMPLOYEE = 0.4
const WEIGHT_INDUSTRY = 0.35
const WEIGHT_SPECIALTIES = 0.25

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
  icpSettings: IcpSettings
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
 * Score employee count match. Returns 0.0 or 1.0.
 */
function scoreEmployeeCount(
  enrichmentCount: string,
  min: number | null,
  max: number | null,
  label: string,
): number {
  if (min === null && max === null) {
    logger.info(`${TAG} ${label} | Employee count: SKIPPED (no min/max criteria configured)`)
    return -1
  }
  const midpoint = parseEmployeeCount(enrichmentCount)
  if (midpoint === null) {
    logger.info(`${TAG} ${label} | Employee count: 0.0 (could not parse "${enrichmentCount}")`)
    return 0
  }

  const effectiveMin = min ?? 0
  const effectiveMax = max ?? Number.MAX_SAFE_INTEGER
  const inRange = midpoint >= effectiveMin && midpoint <= effectiveMax
  const score = inRange ? 1.0 : 0.0

  logger.info(`${TAG} ${label} | Employee count: ${score}`, {
    raw: enrichmentCount,
    parsedMidpoint: midpoint,
    targetRange: `${effectiveMin}-${max === null ? '∞' : effectiveMax}`,
    inRange,
  })

  return score
}

/**
 * Score industry match. Case-insensitive substring comparison.
 */
function scoreIndustryMatch(
  enrichmentIndustry: string,
  targetIndustries: string[],
  label: string,
): number {
  if (targetIndustries.length === 0) {
    logger.info(`${TAG} ${label} | Industry match: SKIPPED (no target industries configured)`)
    return -1
  }
  if (!enrichmentIndustry) {
    logger.info(`${TAG} ${label} | Industry match: 0.0 (no enrichment industry data)`)
    return 0
  }

  const lower = enrichmentIndustry.toLowerCase()
  const matchedTarget = targetIndustries.find(
    t => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower)
  )
  const score = matchedTarget ? 1.0 : 0.0

  logger.info(`${TAG} ${label} | Industry match: ${score}`, {
    enrichmentIndustry,
    targetIndustries,
    matchedTarget: matchedTarget ?? 'none',
  })

  return score
}

/**
 * Score specialties overlap.
 */
function scoreSpecialtiesOverlap(
  enrichmentSpecialties: string[],
  targetSpecialties: string[],
  label: string,
): number {
  if (targetSpecialties.length === 0) {
    logger.info(`${TAG} ${label} | Specialties overlap: SKIPPED (no target specialties configured)`)
    return -1
  }
  if (enrichmentSpecialties.length === 0) {
    logger.info(`${TAG} ${label} | Specialties overlap: 0.0 (no enrichment specialties data)`)
    return 0
  }

  const targetLower = targetSpecialties.map(s => s.toLowerCase())
  const enrichLower = enrichmentSpecialties.map(s => s.toLowerCase())

  const matchedPairs: Array<{ enrichment: string; target: string }> = []
  enrichLower.forEach((s, idx) => {
    const match = targetLower.find(t => s.includes(t) || t.includes(s))
    if (match) matchedPairs.push({ enrichment: enrichmentSpecialties[idx], target: match })
  })

  const score = Math.min(matchedPairs.length / targetSpecialties.length, 1.0)

  logger.info(`${TAG} ${label} | Specialties overlap: ${score.toFixed(2)}`, {
    enrichmentSpecialties,
    targetSpecialties,
    matchedCount: matchedPairs.length,
    matchedPairs,
    formula: `min(${matchedPairs.length} / ${targetSpecialties.length}, 1.0)`,
  })

  return score
}

/**
 * Calculate quantitative score from enrichment vs ICP settings.
 * Returns 0-1 normalized score. Returns 0.5 (neutral) if no criteria configured.
 */
function calculateQuantitativeScore(
  enrichment: CompanyEnrichmentData,
  settings: IcpSettings,
  label: string,
): number {
  const employeeScore = scoreEmployeeCount(
    enrichment.employee_count,
    settings.target_employee_min,
    settings.target_employee_max,
    label,
  )
  const industryScore = scoreIndustryMatch(enrichment.industry, settings.target_industries, label)
  const specialtiesScore = scoreSpecialtiesOverlap(enrichment.specialties, settings.target_specialties, label)

  // Collect active dimensions (skip those with -1 = no criteria)
  const dimensions: Array<{ name: string; score: number; weight: number }> = []
  if (employeeScore >= 0) dimensions.push({ name: 'employee', score: employeeScore, weight: WEIGHT_EMPLOYEE })
  if (industryScore >= 0) dimensions.push({ name: 'industry', score: industryScore, weight: WEIGHT_INDUSTRY })
  if (specialtiesScore >= 0) dimensions.push({ name: 'specialties', score: specialtiesScore, weight: WEIGHT_SPECIALTIES })

  // No criteria at all → neutral
  if (dimensions.length === 0) {
    logger.info(`${TAG} ${label} | Quantitative score: 0.50 (no criteria configured, returning neutral)`)
    return 0.5
  }

  // Normalize weights for active dimensions
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0)
  const weightedScore = dimensions.reduce((sum, d) => sum + d.score * (d.weight / totalWeight), 0)

  const breakdown = dimensions.map(d => {
    const normalizedWeight = d.weight / totalWeight
    return `${d.name}=${d.score.toFixed(2)}*${normalizedWeight.toFixed(2)}=${(d.score * normalizedWeight).toFixed(3)}`
  })

  logger.info(`${TAG} ${label} | Quantitative score: ${weightedScore.toFixed(3)}`, {
    activeDimensions: dimensions.length,
    breakdown: breakdown.join(' + '),
    skippedDimensions: [
      employeeScore < 0 ? 'employee' : null,
      industryScore < 0 ? 'industry' : null,
      specialtiesScore < 0 ? 'specialties' : null,
    ].filter(Boolean),
  })

  return weightedScore
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

// =============================================================================
// Service
// =============================================================================

export class IcpScoringService {
  /**
   * Calculate qualitative score using LLM.
   * Returns 0-1 normalized. Returns 0.5 if inputs missing.
   */
  private async calculateQualitativeScore(
    companyAbout: string,
    icpDescription: string,
    label: string,
  ): Promise<number> {
    if (!companyAbout || !icpDescription) {
      logger.info(`${TAG} ${label} | Qualitative score: 0.50 (skipped — missing inputs)`, {
        hasCompanyAbout: !!companyAbout,
        hasIcpDescription: !!icpDescription,
      })
      return 0.5
    }

    logger.info(`${TAG} ${label} | Qualitative scoring: calling LLM`, {
      companyAboutLength: companyAbout.length,
      icpDescriptionLength: icpDescription.length,
      model: SCORING_MODEL,
    })

    try {
      const { text } = await generateText({
        model: anthropic(SCORING_MODEL),
        system: `You are an ICP (Ideal Customer Profile) scoring assistant. Rate how well a company matches the user's ICP on a scale of 0-100. Return ONLY a number, nothing else.`,
        prompt: `ICP Description:\n${icpDescription}\n\nCompany Description:\n${companyAbout}\n\nScore (0-100):`,
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
        return 0.5
      }

      logger.info(`${TAG} ${label} | Qualitative score: ${(score / 100).toFixed(2)} (LLM raw: ${score}/100)`, {
        rawResponse: text,
        parsedScore: score,
        normalized: score / 100,
      })

      return score / 100
    } catch (error) {
      logger.error(`${TAG} ${label} | Qualitative score: FAILED (LLM error, falling back to 0.50)`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return 0.5
    }
  }

  /**
   * Score a customer against ICP settings.
   */
  async scoreCustomer(input: ScoringInput): Promise<IcpScore> {
    const { enrichment, icpSettings, companyName } = input
    const label = companyName ?? 'unknown'

    logger.info(`${TAG} ${label} | === SCORING STARTED ===`)

    logger.info(`${TAG} ${label} | Enrichment data`, {
      employeeCount: enrichment.employee_count || '(empty)',
      industry: enrichment.industry || '(empty)',
      specialtiesCount: enrichment.specialties?.length ?? 0,
      specialties: enrichment.specialties,
      hasAbout: !!enrichment.about,
      aboutLength: enrichment.about?.length ?? 0,
    })

    logger.info(`${TAG} ${label} | ICP criteria`, {
      employeeRange: `${icpSettings.target_employee_min ?? '∞'} - ${icpSettings.target_employee_max ?? '∞'}`,
      targetIndustries: icpSettings.target_industries,
      targetSpecialties: icpSettings.target_specialties,
      hasDescription: !!icpSettings.description,
      descriptionLength: icpSettings.description?.length ?? 0,
    })

    // --- Quantitative ---
    const quantitative = calculateQuantitativeScore(enrichment, icpSettings, label)

    // --- Qualitative ---
    const hasQualitative = !!icpSettings.description && !!enrichment.about
    const qualitative = hasQualitative
      ? await this.calculateQualitativeScore(enrichment.about, icpSettings.description, label)
      : 0.5

    if (!hasQualitative) {
      logger.info(`${TAG} ${label} | Qualitative scoring: SKIPPED (missing ICP description or company about)`, {
        hasIcpDescription: !!icpSettings.description,
        hasCompanyAbout: !!enrichment.about,
      })
    }

    // --- Composite ---
    const composite = hasQualitative
      ? quantitative * (SYSTEM_WEIGHT_QUANTITATIVE / 100) + qualitative * ((100 - SYSTEM_WEIGHT_QUANTITATIVE) / 100)
      : quantitative // 100% quantitative if no qualitative inputs

    const score = mapToIcpScore(composite)

    const compositeFormula = hasQualitative
      ? `${quantitative.toFixed(3)} * ${SYSTEM_WEIGHT_QUANTITATIVE / 100} + ${qualitative.toFixed(3)} * ${(100 - SYSTEM_WEIGHT_QUANTITATIVE) / 100} = ${composite.toFixed(3)}`
      : `${quantitative.toFixed(3)} (100% quantitative, no qualitative)`

    logger.info(`${TAG} ${label} | === SCORING COMPLETE ===`, {
      quantitativeScore: Math.round(quantitative * 100),
      qualitativeScore: hasQualitative ? Math.round(qualitative * 100) : 'skipped',
      compositeScore: Math.round(composite * 100),
      compositeFormula,
      weights: hasQualitative
        ? `quantitative=${SYSTEM_WEIGHT_QUANTITATIVE}% / qualitative=${100 - SYSTEM_WEIGHT_QUANTITATIVE}%`
        : 'quantitative=100% (qualitative N/A)',
      thresholds: `very_high>=${THRESHOLD_VERY_HIGH * 100} | high>=${THRESHOLD_HIGH * 100} | medium>=${THRESHOLD_MEDIUM * 100} | low<${THRESHOLD_MEDIUM * 100}`,
      result: score,
    })

    return score
  }
}
