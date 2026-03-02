/**
 * Company Classification Service
 *
 * 4-layer pipeline for classifying company names from LinkedIn CSV imports.
 *
 * Layer 0: Deterministic patterns (free, <1ms)
 * Layer 1: Tavily → LinkedIn company page lookup (~$0.60/1000, 200-500ms)
 * Layer 2: LLM batch classification (~$0.15/1000, 1-3s)
 * Layer 3: Fail open (default to company with low_confidence flag)
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { tavilyClient } from '../lib/tavily.js'
import { logger } from '../lib/logger.js'

// =============================================================================
// Types
// =============================================================================

export type ClassificationType = 'company' | 'enclosed' | 'skip'

export interface ClassificationResult {
  type: ClassificationType
  reason: string
  layer: 0 | 1 | 2 | 3
  lowConfidence?: boolean
  linkedinCompanyUrl?: string
}

export interface ClassificationInput {
  companyName: string
  firstName: string
  lastName: string
  position: string
}

// =============================================================================
// Constants
// =============================================================================

const CLASSIFICATION_MODEL = 'claude-haiku-4-5-20251001'
const TAVILY_DELAY_MS = 200
const LLM_BATCH_SIZE = 15
const LLM_BATCH_DELAY_MS = 500
const CONFIDENCE_THRESHOLD = 0.7
const TITLE_SIMILARITY_THRESHOLD = 0.6

export const ENCLOSED_PATTERNS = [
  'stealth', 'confidential', 'building', 'coming soon', 'stealth mode',
  'tbd', 'undisclosed', 'pre-launch', 'secret', 'stealth startup',
]

export const NON_COMPANY_PATTERNS = [
  'none', 'self-employed', 'freelance', 'freelancer', 'independent',
  'retired', 'student', 'unemployed', 'n/a', 'na', '-', '.', '--',
  'looking for opportunities', 'open to work', 'between roles',
]

export const COMPANY_SUFFIXES = [
  'inc', 'corp', 'corporation', 'ltd', 'llc', 'llp', 'co', 'company',
  'group', 'holdings', 'partners', 'technologies', 'solutions', 'systems',
  'services', 'labs', 'studio', 'studios', 'agency', 'consulting',
  'ventures', 'capital', 'media', 'digital', 'global', 'international',
  'foundation', 'institute', 'university', 'hospital', 'bank',
]

export const COUNTRY_NAMES = [
  'israel', 'united states', 'united kingdom', 'germany', 'france',
  'canada', 'australia', 'india', 'china', 'japan', 'brazil',
  'spain', 'italy', 'netherlands', 'sweden', 'norway', 'denmark',
  'finland', 'switzerland', 'austria', 'belgium', 'portugal',
  'ireland', 'new zealand', 'singapore', 'south korea', 'mexico',
  'argentina', 'colombia', 'chile', 'poland', 'czech republic',
  'romania', 'hungary', 'greece', 'turkey', 'thailand', 'vietnam',
  'philippines', 'indonesia', 'malaysia', 'taiwan', 'hong kong',
]

// =============================================================================
// Service
// =============================================================================

export class CompanyClassificationService {
  private cache = new Map<string, ClassificationResult>()

  /**
   * Classify all unique company names from the import batch.
   * Processes through 4 layers: deterministic → Tavily → LLM → fail-open.
   */
  async classifyBatch(
    inputs: ClassificationInput[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<Map<string, ClassificationResult>> {
    // Deduplicate by normalized company name
    const uniqueMap = new Map<string, ClassificationInput>()
    for (const input of inputs) {
      const key = input.companyName.toLowerCase().trim()
      if (!key) continue
      if (!uniqueMap.has(key)) uniqueMap.set(key, input)
    }

    const uniqueEntries = Array.from(uniqueMap.entries())
    const total = uniqueEntries.length
    let processed = 0

    // --- Layer 0: Deterministic ---
    const unresolvedAfterL0: ClassificationInput[] = []

    for (const [key, input] of uniqueEntries) {
      const result = this.classifyDeterministic(input)
      if (result) {
        this.cache.set(key, result)
      } else {
        unresolvedAfterL0.push(input)
      }
      processed++
      onProgress?.(processed, total)
    }

    logger.debug('[CompanyClassification] Layer 0 complete', {
      resolved: total - unresolvedAfterL0.length,
      unresolved: unresolvedAfterL0.length,
    })

    // --- Layer 1: Tavily LinkedIn Lookup ---
    const unresolvedAfterL1: ClassificationInput[] = []

    if (unresolvedAfterL0.length > 0 && tavilyClient.isConfigured()) {
      for (const input of unresolvedAfterL0) {
        const key = input.companyName.toLowerCase().trim()
        const result = await this.classifyViaTavily(input.companyName)

        if (result) {
          this.cache.set(key, result)
        } else {
          unresolvedAfterL1.push(input)
        }

        processed++
        onProgress?.(processed, total)

        // Rate limit between Tavily calls
        if (unresolvedAfterL0.indexOf(input) < unresolvedAfterL0.length - 1) {
          await delay(TAVILY_DELAY_MS)
        }
      }
    } else {
      // Tavily not configured — pass all to Layer 2
      unresolvedAfterL1.push(...unresolvedAfterL0)
    }

    logger.debug('[CompanyClassification] Layer 1 complete', {
      resolved: unresolvedAfterL0.length - unresolvedAfterL1.length,
      unresolved: unresolvedAfterL1.length,
    })

    // --- Layer 2: LLM Batch Classification ---
    const unresolvedAfterL2: ClassificationInput[] = []

    if (unresolvedAfterL1.length > 0) {
      const batchResults = await this.classifyViaBatchLlm(unresolvedAfterL1)

      for (const input of unresolvedAfterL1) {
        const key = input.companyName.toLowerCase().trim()
        if (batchResults.has(key)) {
          this.cache.set(key, batchResults.get(key)!)
        } else {
          unresolvedAfterL2.push(input)
        }
      }
    }

    logger.debug('[CompanyClassification] Layer 2 complete', {
      resolved: unresolvedAfterL1.length - unresolvedAfterL2.length,
      unresolved: unresolvedAfterL2.length,
    })

    // --- Layer 3: Fail Open ---
    for (const input of unresolvedAfterL2) {
      const key = input.companyName.toLowerCase().trim()
      this.cache.set(key, {
        type: 'company',
        reason: 'Fail-open: unclassified, defaulting to company',
        layer: 3,
        lowConfidence: true,
      })
    }

    // Final progress
    onProgress?.(total, total)

    logger.info('[CompanyClassification] Classification complete', {
      total,
      layer0: total - unresolvedAfterL0.length,
      layer1: unresolvedAfterL0.length - unresolvedAfterL1.length,
      layer2: unresolvedAfterL1.length - unresolvedAfterL2.length,
      layer3: unresolvedAfterL2.length,
    })

    return this.cache
  }

  // ===========================================================================
  // Layer 0: Deterministic Patterns
  // ===========================================================================

  private classifyDeterministic(input: ClassificationInput): ClassificationResult | null {
    const name = input.companyName.trim()
    const lower = name.toLowerCase()

    // 1. Empty / whitespace / single character
    if (!lower || lower.length <= 1) {
      return { type: 'skip', reason: 'Empty or single-character name', layer: 0 }
    }

    // 2. Numbers only (e.g., "111")
    if (/^\d+$/.test(lower)) {
      return { type: 'skip', reason: 'Numbers-only name', layer: 0 }
    }

    // 3. Non-company exact match
    if (NON_COMPANY_PATTERNS.includes(lower)) {
      return { type: 'skip', reason: `Non-company pattern: ${lower}`, layer: 0 }
    }

    // 4. Country name exact match
    if (COUNTRY_NAMES.includes(lower)) {
      return { type: 'skip', reason: `Country name: ${lower}`, layer: 0 }
    }

    // 5. Self-name match (company field === connection's own name)
    if (isPersonalNameMatch(lower, input.firstName, input.lastName)) {
      return { type: 'skip', reason: 'Personal name matches connection', layer: 0 }
    }

    // 6. Enclosed company exact match
    if (ENCLOSED_PATTERNS.includes(lower)) {
      return { type: 'enclosed', reason: `Enclosed company pattern: ${lower}`, layer: 0 }
    }

    // 7. Has company suffix → fast-track as company
    if (hasCompanySuffix(lower)) {
      return { type: 'company', reason: 'Has company suffix', layer: 0 }
    }

    // Not resolved by Layer 0
    return null
  }

  // ===========================================================================
  // Layer 1: Tavily → LinkedIn Company Lookup
  // ===========================================================================

  private async classifyViaTavily(companyName: string): Promise<ClassificationResult | null> {
    try {
      const results = await tavilyClient.search(
        `"${companyName}" company`,
        {
          includeDomains: ['linkedin.com'],
          maxResults: 3,
          searchDepth: 'basic',
          includeRawContent: false,
        },
      )

      const companyUrls = results.filter(r => r.url.includes('/company/'))
      const profileUrls = results.filter(r => r.url.includes('/in/'))

      // Company page found with sufficient title similarity
      if (companyUrls.length > 0) {
        const best = companyUrls[0]
        const similarity = titleSimilarity(companyName, best.title)

        if (similarity >= TITLE_SIMILARITY_THRESHOLD) {
          return {
            type: 'company',
            reason: `LinkedIn company page found (similarity: ${Math.round(similarity * 100)}%)`,
            layer: 1,
            linkedinCompanyUrl: best.url,
          }
        }
      }

      // Only personal profile URLs → likely a person's name
      if (profileUrls.length > 0 && companyUrls.length === 0) {
        return {
          type: 'skip',
          reason: 'Only LinkedIn personal profiles found',
          layer: 1,
        }
      }

      // No useful results → pass to Layer 2
      return null
    } catch {
      logger.warn('[CompanyClassification] Tavily lookup failed, falling through to Layer 2')
      return null
    }
  }

  // ===========================================================================
  // Layer 2: LLM Batch Classification
  // ===========================================================================

  private async classifyViaBatchLlm(
    items: ClassificationInput[],
  ): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>()

    for (let i = 0; i < items.length; i += LLM_BATCH_SIZE) {
      const batch = items.slice(i, i + LLM_BATCH_SIZE)

      const prompt = `Classify each entry below. For each, determine if the "company" field is:
- "company": A real business or organization name
- "personal_name": A person's name (not a company)
- "enclosed": Stealth/undisclosed/confidential placeholder
- "non_company": Generic term, placeholder, job title, or not a company name

Return a JSON array with one object per entry:
[{ "index": 0, "type": "company", "confidence": 0.95 }, ...]

Context clues:
- If position is "Founder"/"CEO"/"Owner" and company looks like a person's name, it might be a real company (solo founders name companies after themselves)
- Entries with no position and a person's name as company are likely personal_name
- Well-known tech companies, startups, and organizations should be "company" with high confidence

Entries:
${batch.map((item, idx) => `${idx}. company="${item.companyName}", person="${item.firstName} ${item.lastName}", position="${item.position}"`).join('\n')}

Return ONLY a valid JSON array. No markdown fences, no explanation.`

      try {
        const { text } = await generateText({
          model: anthropic(CLASSIFICATION_MODEL),
          system: 'You are a data classification assistant. Classify company names from LinkedIn connection data. Return only JSON.',
          prompt,
          maxOutputTokens: 1000,
        })

        // Strip markdown fences if present
        let jsonText = text.trim()
        const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (fenceMatch) jsonText = fenceMatch[1].trim()

        const parsed = JSON.parse(jsonText) as Array<{
          index: number
          type: 'company' | 'personal_name' | 'enclosed' | 'non_company'
          confidence: number
        }>

        const typeMap: Record<string, ClassificationType> = {
          company: 'company',
          personal_name: 'skip',
          enclosed: 'enclosed',
          non_company: 'skip',
        }

        for (const entry of parsed) {
          const item = batch[entry.index]
          if (!item) continue

          const key = item.companyName.toLowerCase().trim()

          if (entry.confidence >= CONFIDENCE_THRESHOLD) {
            const reasonType = entry.type === 'personal_name' ? 'Personal name' :
              entry.type === 'non_company' ? 'Non-company' :
              entry.type === 'enclosed' ? 'Enclosed company' : 'Company'

            results.set(key, {
              type: typeMap[entry.type] || 'company',
              reason: `LLM: ${reasonType} (${Math.round(entry.confidence * 100)}% confidence)`,
              layer: 2,
            })
          }
          // confidence < threshold → not added → will fall to Layer 3
        }
      } catch {
        logger.warn('[CompanyClassification] LLM batch classification failed', {
          batchSize: batch.length,
          batchOffset: i,
        })
        // Items not in results will fall to Layer 3
      }

      // Rate limit between LLM batches
      if (i + LLM_BATCH_SIZE < items.length) {
        await delay(LLM_BATCH_DELAY_MS)
      }
    }

    return results
  }
}

// =============================================================================
// Helpers
// =============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isPersonalNameMatch(companyLower: string, firstName: string, lastName: string): boolean {
  const first = firstName.trim().toLowerCase()
  const last = lastName.trim().toLowerCase()
  if (!first || !last) return false

  return companyLower === `${first} ${last}` || companyLower === `${last} ${first}`
}

function hasCompanySuffix(nameLower: string): boolean {
  const words = nameLower.replace(/[.,]+$/, '').split(/\s+/)
  const lastWord = words[words.length - 1]
  return COMPANY_SUFFIXES.includes(lastWord)
}

/**
 * Jaccard word overlap between company name and Tavily result title.
 * Strips common LinkedIn suffixes from the title before comparison.
 */
function titleSimilarity(companyName: string, tavilyTitle: string): number {
  // Strip "| LinkedIn", "- LinkedIn", "· LinkedIn" etc.
  const cleanTitle = tavilyTitle.replace(/\s*[|–·-]\s*LinkedIn.*$/i, '').trim()

  const aWords = new Set(companyName.toLowerCase().split(/\s+/).filter(w => w.length > 0))
  const bWords = new Set(cleanTitle.toLowerCase().split(/\s+/).filter(w => w.length > 0))

  if (aWords.size === 0 || bWords.size === 0) return 0

  const intersection = [...aWords].filter(w => bWords.has(w)).length
  const union = new Set([...aWords, ...bWords]).size

  return union > 0 ? intersection / union : 0
}
