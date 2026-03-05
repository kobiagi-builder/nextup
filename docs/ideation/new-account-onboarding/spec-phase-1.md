# New Account Onboarding — Phase 1 Implementation Spec

**Status:** Ready for Implementation  
**Phase:** 1 of 2 (Infrastructure + Core Wizard Flow)  
**Last Updated:** 2026-03-02  
**Supabase Project:** `ohwubfmipnpguunryopl`

---

## 1. Technical Approach

Phase 1 adds a full onboarding wizard that new users see before reaching the main application. The approach is database-first: a dedicated `onboarding_progress` table with two structurally separate JSONB columns (`extraction_results` and `step_data`) eliminates the write-ordering race conditions that would occur if a single column were shared between the async extraction background job and the auto-save handler. The backend exposes two new endpoints under `/api/onboarding` — one for extraction orchestration, one for progress persistence — both protected by the existing `requireAuth` middleware and added to `backend/src/routes/index.ts`.

The routing integration wraps the existing `AppShell` subtree in a new `OnboardingGate` component that fetches `onboarding_progress` via React Query. This component makes exactly one determination: absent row (new user, redirect to `/onboarding`), row present with `completed_at` null (incomplete, redirect to `/onboarding`), or `completed_at` set (done, render app as normal). The `/onboarding` route itself uses `ProtectedRoute` only — no `AppShell`, no `OnboardingGate` — preventing circular redirect loops. `App.tsx` gains exactly two new route entries.

The AI extraction service follows a tiered approach matching existing `publicationScraper.ts` and `EnrichmentService.ts` patterns: fetch HTML with `AbortSignal.timeout(30_000)`, parse with cheerio, pass structured text to Claude Haiku 4.5 via `@ai-sdk/anthropic` `generateText`. The model used is `claude-haiku-4-5-20251001` (consistent with `EnrichmentService.ts`). Claude's JSON response is stripped of markdown fences before parsing — as noted in project memory, Haiku 4.5 wraps JSON in fences. The extraction endpoint responds synchronously (not streamed): the controller starts a background Promise and returns `202 Accepted` with the partial `onboarding_progress` row immediately, while extraction writes `extraction_results` asynchronously. The frontend advances to Step 2 on the `202`, shows skeleton UI, then polls until `extraction_results` appears.

---

## 2. File Changes

### New Files

| File Path | Purpose |
|-----------|---------|
| `backend/src/routes/onboarding.ts` | Express Router for `/api/onboarding/*` endpoints |
| `backend/src/controllers/onboarding.controller.ts` | Request handlers: getProgress, saveProgress, extractProfile |
| `backend/src/services/ProfileExtractionService.ts` | URL fetch → cheerio parse → Claude extraction → field mapping |
| `frontend/src/features/onboarding/` | Feature directory (full structure below) |
| `frontend/src/features/onboarding/pages/OnboardingPage.tsx` | Root page component rendered at `/onboarding` |
| `frontend/src/features/onboarding/components/WizardShell.tsx` | Step container: progress indicator, header, skip link |
| `frontend/src/features/onboarding/components/WelcomeStep.tsx` | Unnumbered intro screen |
| `frontend/src/features/onboarding/components/ImportStep.tsx` | Step 1 of 4: URL input + Extract button + paste fallback |
| `frontend/src/features/onboarding/components/ProfileStep.tsx` | Step 2 of 4: About Me + Profession fields |
| `frontend/src/features/onboarding/components/MarketStep.tsx` | Step 3 of 4: Customers + Goals fields |
| `frontend/src/features/onboarding/components/VoiceStep.tsx` | Step 4 of 4: Writing references inline card |
| `frontend/src/features/onboarding/components/CompletionStep.tsx` | Unnumbered celebration screen |
| `frontend/src/features/onboarding/components/OnboardingReferenceUpload.tsx` | Inline reference upload (no Sheet/drawer) |
| `frontend/src/features/onboarding/hooks/useOnboardingProgress.ts` | React Query: fetch/save progress, poll extraction |
| `frontend/src/features/onboarding/hooks/useExtractProfile.ts` | React Query mutation: POST `/api/onboarding/extract-profile` |
| `frontend/src/features/onboarding/stores/onboardingWizardStore.ts` | Zustand store (no persist) |
| `frontend/src/features/onboarding/types/onboarding.ts` | TypeScript interfaces |
| `frontend/src/features/onboarding/schemas/userContext.ts` | Shared Zod schemas (extracted from `UserContextForm.tsx`) |
| `frontend/src/components/auth/OnboardingGate.tsx` | Route guard that checks `onboarding_progress` |

### Modified Files

| File Path | Change |
|-----------|--------|
| `backend/src/routes/index.ts` | Add `router.use('/onboarding', requireAuth, onboardingRouter)` |
| `frontend/src/App.tsx` | Add `/onboarding` route + `OnboardingGate` wrapper around `AppShell` subtree |
| `frontend/src/features/portfolio/pages/PortfolioPage.tsx` | Add "Complete your profile" empty-state card when `onboarding_progress.completed_at` is null and user skipped |

---

## 3. Implementation Details

### 3.1 Database Migration

**File name convention:** `add_onboarding_progress` (see Section 4 for SQL)

Apply via:
```typescript
mcp__supabase__apply_migration({
  project_id: "ohwubfmipnpguunryopl",
  name: "add_onboarding_progress",
  query: "..." // SQL from Section 4
})
```

### 3.2 Backend: Route Registration

**`backend/src/routes/index.ts`** — append before final export:

```typescript
import onboardingRouter from './onboarding.js'

router.use('/onboarding', requireAuth, onboardingRouter)
```

### 3.3 Backend: Onboarding Router

**`backend/src/routes/onboarding.ts`**

```typescript
import { Router } from 'express'
import {
  getProgress,
  saveProgress,
  extractProfile,
} from '../controllers/onboarding.controller.js'
import { createRateLimiter } from '../middleware/rateLimiter.js'

const extractionLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'Too many extraction requests. Please wait before trying again.',
})

const router = Router()

// GET /api/onboarding/progress
router.get('/progress', getProgress)

// PUT /api/onboarding/progress
router.put('/progress', saveProgress)

// POST /api/onboarding/extract-profile
router.post('/extract-profile', extractionLimit, extractProfile)

export default router
```

### 3.4 Backend: Onboarding Controller

**`backend/src/controllers/onboarding.controller.ts`**

```typescript
import { Request, Response } from 'express'
import { getSupabase } from '../lib/requestContext.js'
import { logger } from '../lib/logger.js'
import { ProfileExtractionService } from '../services/ProfileExtractionService.js'
import { z } from 'zod'

// --------------------------------------------------------------------------
// GET /api/onboarding/progress
// --------------------------------------------------------------------------
export const getProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data, error } = await getSupabase()
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      logger.error('[Onboarding] Error fetching progress', {
        sourceCode: 'getProgress',
        error: error instanceof Error ? error : new Error(error.message),
      })
      res.status(500).json({ error: 'Database error', message: 'Failed to fetch onboarding progress' })
      return
    }

    // No row = new user — return null (frontend treats this as redirect to /onboarding)
    res.status(200).json({ progress: data })
  } catch (error) {
    logger.error('[Onboarding] Unexpected error in getProgress', {
      sourceCode: 'getProgress',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// --------------------------------------------------------------------------
// PUT /api/onboarding/progress
// --------------------------------------------------------------------------
const saveProgressSchema = z.object({
  current_step: z.number().int().min(0).max(5).optional(),
  step_data: z.record(z.unknown()).optional(),
  completed_at: z.string().datetime().nullable().optional(),
})

export const saveProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

    const parsed = saveProgressSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', message: parsed.error.message })
      return
    }

    const { current_step, step_data, completed_at } = parsed.data

    // Build update payload — only write columns that were provided
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (current_step !== undefined) updates.current_step = current_step
    if (step_data !== undefined) updates.step_data = step_data
    if (completed_at !== undefined) updates.completed_at = completed_at

    const { data, error } = await getSupabase()
      .from('onboarding_progress')
      .upsert(
        { user_id: userId, ...updates },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) {
      logger.error('[Onboarding] Error saving progress', {
        sourceCode: 'saveProgress',
        error: error instanceof Error ? error : new Error(error.message),
      })
      res.status(500).json({ error: 'Database error', message: 'Failed to save onboarding progress' })
      return
    }

    logger.info('[Onboarding] Progress saved', {
      currentStep: current_step,
      hasStepData: !!step_data,
      isCompleted: !!completed_at,
    })

    res.status(200).json({ progress: data })
  } catch (error) {
    logger.error('[Onboarding] Unexpected error in saveProgress', {
      sourceCode: 'saveProgress',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    res.status(500).json({ error: 'Internal server error' })
  }
}

// --------------------------------------------------------------------------
// POST /api/onboarding/extract-profile
// --------------------------------------------------------------------------
const extractProfileSchema = z.object({
  websiteUrl: z.string().url().optional(),
  linkedInUrl: z.string().url().optional(),
  pastedText: z.string().max(20000).optional(),
}).refine(
  (d) => d.websiteUrl || d.linkedInUrl || d.pastedText,
  { message: 'At least one of websiteUrl, linkedInUrl, or pastedText is required' }
)

export const extractProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return }

    const parsed = extractProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', message: parsed.error.message })
      return
    }

    const { websiteUrl, linkedInUrl, pastedText } = parsed.data

    // Ensure a row exists before background job writes to it
    const { error: upsertError } = await getSupabase()
      .from('onboarding_progress')
      .upsert(
        {
          user_id: userId,
          current_step: 1,
          extraction_results: null,
          step_data: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id', ignoreDuplicates: true }
      )

    if (upsertError) {
      logger.error('[Onboarding] Failed to ensure onboarding row', {
        sourceCode: 'extractProfile.upsert',
        error: upsertError instanceof Error ? upsertError : new Error(upsertError.message),
      })
      res.status(500).json({ error: 'Database error' })
      return
    }

    // Respond immediately — extraction runs in background
    res.status(202).json({ message: 'Extraction started', status: 'extracting' })

    // Background extraction (fire-and-forget)
    const service = new ProfileExtractionService()
    service.extract({ websiteUrl, linkedInUrl, pastedText })
      .then(async (results) => {
        const { error } = await getSupabase()
          .from('onboarding_progress')
          .update({
            extraction_results: results,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)

        if (error) {
          logger.error('[Onboarding] Failed to write extraction_results', {
            sourceCode: 'extractProfile.background',
            error: error instanceof Error ? error : new Error(error.message),
          })
        } else {
          logger.info('[Onboarding] Extraction results saved', {
            hasAboutMe: !!results.about_me,
            hasProfession: !!results.profession,
            hasCustomers: !!results.customers,
          })
        }
      })
      .catch((err) => {
        logger.error('[Onboarding] Background extraction failed', {
          sourceCode: 'extractProfile.background',
          error: err instanceof Error ? err : new Error(String(err)),
        })
        // Write a failure marker so frontend can stop polling
        getSupabase()
          .from('onboarding_progress')
          .update({
            extraction_results: { __error: true, __message: 'Extraction failed' },
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .then(() => {})
      })
  } catch (error) {
    logger.error('[Onboarding] Unexpected error in extractProfile', {
      sourceCode: 'extractProfile',
      error: error instanceof Error ? error : new Error(String(error)),
    })
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
```

### 3.5 Backend: ProfileExtractionService

**`backend/src/services/ProfileExtractionService.ts`**

Follows `EnrichmentService.ts` and `publicationScraper.ts` patterns exactly: `fetchHtml` + cheerio + `generateText` from `@ai-sdk/anthropic`.

```typescript
import * as cheerio from 'cheerio'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logger } from '../lib/logger.js'

// Model consistent with EnrichmentService.ts
const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'
const TIMEOUT_MS = 30_000
const MAX_TEXT_LENGTH = 10_000

export interface ExtractionInput {
  websiteUrl?: string
  linkedInUrl?: string
  pastedText?: string
}

export interface ExtractedProfileFields {
  about_me?: {
    bio?: string
    background?: string
    value_proposition?: string
  }
  profession?: {
    expertise_areas?: string
    industries?: string
    methodologies?: string
    certifications?: string
  }
  customers?: {
    target_audience?: string
    ideal_client?: string
    industries_served?: string[]
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NextUp/1.0)',
      Accept: 'text/html',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  const html = await response.text()
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, aside, iframe, noscript').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  return text.slice(0, MAX_TEXT_LENGTH)
}

function stripFences(raw: string): string {
  // Haiku 4.5 wraps JSON in markdown fences — strip them
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

const EXTRACTION_SYSTEM_PROMPT = `You are a profile extraction assistant. Given raw text scraped from a consultant's website or LinkedIn profile, extract structured information about them.

Return ONLY a JSON object with this shape (omit any section you cannot reliably determine):
{
  "about_me": {
    "bio": "1–3 sentence professional bio",
    "background": "bullet-point list of career background items, one per line starting with •",
    "value_proposition": "what unique value this person brings to clients"
  },
  "profession": {
    "expertise_areas": "bullet-point list of core expertise areas, one per line starting with •",
    "industries": "bullet-point list of industries they work in, one per line starting with •",
    "methodologies": "bullet-point list of methodologies/frameworks, one per line starting with •",
    "certifications": "bullet-point list of certifications/credentials, one per line starting with •"
  },
  "customers": {
    "target_audience": "description of who they serve",
    "ideal_client": "characteristics of their ideal client",
    "industries_served": ["array", "of", "industry", "strings"]
  }
}

Rules:
- Only include fields when you have clear evidence from the text
- Keep bio under 300 characters
- Use bullet format (• item) for list fields
- Do NOT hallucinate or infer beyond what is in the provided text
- Return ONLY valid JSON, no markdown fences, no explanation`

export class ProfileExtractionService {
  async extract(input: ExtractionInput): Promise<ExtractedProfileFields> {
    let sourceText = ''
    let sourceDescription = 'paste'

    if (input.pastedText) {
      sourceText = input.pastedText.slice(0, MAX_TEXT_LENGTH)
      sourceDescription = 'paste'
    } else if (input.websiteUrl) {
      try {
        sourceText = await fetchText(input.websiteUrl)
        sourceDescription = 'website'
      } catch (err) {
        logger.warn('[ProfileExtraction] Website fetch failed, trying LinkedIn', {
          hasWebsiteUrl: true,
          error: err instanceof Error ? err.message : 'unknown',
        })
        // Fall through to LinkedIn
      }
    }

    if (!sourceText && input.linkedInUrl) {
      try {
        sourceText = await fetchText(input.linkedInUrl)
        sourceDescription = 'linkedin'
      } catch (err) {
        logger.warn('[ProfileExtraction] LinkedIn fetch failed', {
          hasLinkedInUrl: true,
          error: err instanceof Error ? err.message : 'unknown',
        })
      }
    }

    if (!sourceText) {
      logger.warn('[ProfileExtraction] No source text available — returning empty results')
      return {}
    }

    logger.info('[ProfileExtraction] Extracting from source', {
      sourceDescription,
      textLength: sourceText.length,
    })

    try {
      const { text } = await generateText({
        model: anthropic(EXTRACTION_MODEL),
        system: EXTRACTION_SYSTEM_PROMPT,
        prompt: `Extract structured profile information from this text:\n\n${sourceText}`,
        maxTokens: 1500,
      })

      const cleaned = stripFences(text)
      const parsed = JSON.parse(cleaned) as ExtractedProfileFields

      logger.info('[ProfileExtraction] Extraction complete', {
        hasAboutMe: !!parsed.about_me,
        hasProfession: !!parsed.profession,
        hasCustomers: !!parsed.customers,
      })

      return parsed
    } catch (err) {
      logger.error('[ProfileExtraction] Claude extraction failed', {
        sourceCode: 'extract',
        error: err instanceof Error ? err : new Error(String(err)),
      })
      return {}
    }
  }
}
```

### 3.6 Frontend: Shared Zod Schemas

**`frontend/src/features/onboarding/schemas/userContext.ts`**

These schemas are copied from `UserContextForm.tsx` with no changes to logic — they are extracted to enable reuse in the onboarding wizard without importing that component.

```typescript
import { z } from 'zod'

export const aboutMeSchema = z.object({
  bio: z.string().max(1000).optional(),
  background: z.string().max(5000).optional(),
  years_experience: z.number().min(0).max(50).optional().nullable(),
  value_proposition: z.string().max(500).optional(),
})

export const professionSchema = z.object({
  expertise_areas: z.string().max(2000).optional(),
  industries: z.string().max(2000).optional(),
  methodologies: z.string().max(2000).optional(),
  certifications: z.string().max(2000).optional(),
})

export const customersSchema = z.object({
  target_audience: z.string().max(2000).optional(),
  ideal_client: z.string().max(2000).optional(),
  industries_served: z.array(z.string()).optional(),
})

export const goalsSchema = z.object({
  content_goals: z.string().max(2000).optional(),
  business_goals: z.string().max(2000).optional(),
})

export type AboutMeFormData = z.infer<typeof aboutMeSchema>
export type ProfessionFormData = z.infer<typeof professionSchema>
export type CustomersFormData = z.infer<typeof customersSchema>
export type GoalsFormData = z.infer<typeof goalsSchema>
```

### 3.7 Frontend: TypeScript Interfaces

**`frontend/src/features/onboarding/types/onboarding.ts`**

```typescript
import type { AboutMeFormData, ProfessionFormData, CustomersFormData, GoalsFormData } from '../schemas/userContext'

export type ExtractionStatus =
  | 'idle'
  | 'submitted'
  | 'extracting'
  | 'complete'
  | 'failed'
  | 'timeout'
  | 'skipped'

export type FieldProvenance = 'ai' | 'user' | 'empty'

export interface OnboardingFormData {
  about_me: AboutMeFormData
  profession: ProfessionFormData
  customers: CustomersFormData
  goals: GoalsFormData
}

export interface ExtractedProfileFields {
  about_me?: Partial<AboutMeFormData>
  profession?: Partial<ProfessionFormData>
  customers?: Partial<CustomersFormData>
  __error?: boolean
}

export interface OnboardingProgress {
  id: string
  user_id: string
  current_step: number
  extraction_results: ExtractedProfileFields | null
  step_data: Partial<OnboardingFormData>
  completed_at: string | null
  created_at: string
  updated_at: string
}
```

### 3.8 Frontend: Zustand Store

**`frontend/src/features/onboarding/stores/onboardingWizardStore.ts`**

No `persist` middleware — state re-hydrates from server on every load.

```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ExtractionStatus,
  FieldProvenance,
  OnboardingFormData,
  ExtractedProfileFields,
} from '../types/onboarding'

// --------------------------------------------------------------------------
// Defaults
// --------------------------------------------------------------------------

const emptyFormData: OnboardingFormData = {
  about_me: { bio: '', background: '', years_experience: null, value_proposition: '' },
  profession: { expertise_areas: '', industries: '', methodologies: '', certifications: '' },
  customers: { target_audience: '', ideal_client: '', industries_served: [] },
  goals: { content_goals: '', business_goals: '' },
}

const allEmpty = (formData: OnboardingFormData): Record<string, FieldProvenance> => {
  const result: Record<string, FieldProvenance> = {}
  const fields = [
    ...Object.keys(formData.about_me),
    ...Object.keys(formData.profession),
    ...Object.keys(formData.customers),
    ...Object.keys(formData.goals),
  ]
  fields.forEach((f) => { result[f] = 'empty' })
  return result
}

// --------------------------------------------------------------------------
// Store Interface
// --------------------------------------------------------------------------

interface OnboardingWizardState {
  currentStep: number
  extractionStatus: ExtractionStatus
  linkedInUrl: string
  websiteUrl: string
  formData: OnboardingFormData
  fieldProvenance: Record<string, FieldProvenance>
  addedReferenceIds: string[]
}

interface OnboardingWizardActions {
  setStep: (step: number) => void
  setExtractionStatus: (status: ExtractionStatus) => void
  setLinkedInUrl: (url: string) => void
  setWebsiteUrl: (url: string) => void
  updateField: <
    Section extends keyof OnboardingFormData,
    Field extends keyof OnboardingFormData[Section]
  >(
    section: Section,
    field: Field,
    value: OnboardingFormData[Section][Field]
  ) => void
  // Apply AI extraction results with merge policy:
  // - 'empty' provenance → accept result, set provenance 'ai'
  // - 'user' provenance  → discard result (user already typed)
  // - 'ai' provenance    → accept updated result
  applyExtractionResults: (results: ExtractedProfileFields) => void
  addReferenceId: (id: string) => void
  removeReferenceId: (id: string) => void
  hydrateFromServer: (
    step: number,
    stepData: Partial<OnboardingFormData>,
    extractionResults: ExtractedProfileFields | null
  ) => void
  reset: () => void
}

type OnboardingWizardStore = OnboardingWizardState & OnboardingWizardActions

// --------------------------------------------------------------------------
// Store
// --------------------------------------------------------------------------

export const useOnboardingWizardStore = create<OnboardingWizardStore>()(
  devtools(
    (set, get) => ({
      currentStep: 0,
      extractionStatus: 'idle',
      linkedInUrl: '',
      websiteUrl: '',
      formData: emptyFormData,
      fieldProvenance: allEmpty(emptyFormData),
      addedReferenceIds: [],

      setStep: (step) => set({ currentStep: step }, false, 'setStep'),

      setExtractionStatus: (status) =>
        set({ extractionStatus: status }, false, 'setExtractionStatus'),

      setLinkedInUrl: (url) => set({ linkedInUrl: url }, false, 'setLinkedInUrl'),

      setWebsiteUrl: (url) => set({ websiteUrl: url }, false, 'setWebsiteUrl'),

      updateField: (section, field, value) =>
        set(
          (state) => ({
            formData: {
              ...state.formData,
              [section]: { ...state.formData[section], [field]: value },
            },
            fieldProvenance: {
              ...state.fieldProvenance,
              [field as string]: 'user' as FieldProvenance,
            },
          }),
          false,
          'updateField'
        ),

      applyExtractionResults: (results) =>
        set(
          (state) => {
            const newFormData = { ...state.formData }
            const newProvenance = { ...state.fieldProvenance }

            const sections = ['about_me', 'profession', 'customers'] as const
            for (const section of sections) {
              const sectionResults = results[section]
              if (!sectionResults) continue
              newFormData[section] = { ...newFormData[section] } as typeof newFormData[typeof section]
              for (const [field, value] of Object.entries(sectionResults)) {
                const currentProvenance = newProvenance[field] as FieldProvenance
                if (currentProvenance !== 'user') {
                  // Accept for 'empty' and 'ai' (updated result)
                  ;(newFormData[section] as Record<string, unknown>)[field] = value
                  newProvenance[field] = 'ai'
                }
              }
            }

            return {
              formData: newFormData,
              fieldProvenance: newProvenance,
              extractionStatus: 'complete',
            }
          },
          false,
          'applyExtractionResults'
        ),

      addReferenceId: (id) =>
        set(
          (state) => ({ addedReferenceIds: [...state.addedReferenceIds, id] }),
          false,
          'addReferenceId'
        ),

      removeReferenceId: (id) =>
        set(
          (state) => ({
            addedReferenceIds: state.addedReferenceIds.filter((r) => r !== id),
          }),
          false,
          'removeReferenceId'
        ),

      hydrateFromServer: (step, stepData, extractionResults) =>
        set(
          (state) => {
            const hydrated: OnboardingFormData = {
              about_me: { ...emptyFormData.about_me, ...(stepData.about_me ?? {}) },
              profession: { ...emptyFormData.profession, ...(stepData.profession ?? {}) },
              customers: { ...emptyFormData.customers, ...(stepData.customers ?? {}) },
              goals: { ...emptyFormData.goals, ...(stepData.goals ?? {}) },
            }

            // Build provenance: fields with values are 'user', others 'empty'
            const provenance: Record<string, FieldProvenance> = allEmpty(hydrated)
            const sections = ['about_me', 'profession', 'customers', 'goals'] as const
            for (const section of sections) {
              for (const [field, value] of Object.entries(hydrated[section])) {
                if (value !== '' && value !== null && value !== undefined) {
                  provenance[field] = 'user'
                }
              }
            }

            // Apply any AI extraction results on top
            let finalFormData = hydrated
            let finalProvenance = provenance
            if (extractionResults && !extractionResults.__error) {
              // Reuse applyExtractionResults logic inline
              const mockState = { formData: hydrated, fieldProvenance: provenance }
              const extractSections = ['about_me', 'profession', 'customers'] as const
              for (const section of extractSections) {
                const sectionResults = extractionResults[section]
                if (!sectionResults) continue
                for (const [field, value] of Object.entries(sectionResults)) {
                  if (finalProvenance[field] !== 'user') {
                    ;(finalFormData[section] as Record<string, unknown>)[field] = value
                    finalProvenance[field] = 'ai'
                  }
                }
              }
            }

            return {
              currentStep: step,
              formData: finalFormData,
              fieldProvenance: finalProvenance,
              extractionStatus:
                extractionResults
                  ? extractionResults.__error
                    ? 'failed'
                    : 'complete'
                  : state.extractionStatus,
            }
          },
          false,
          'hydrateFromServer'
        ),

      reset: () =>
        set(
          {
            currentStep: 0,
            extractionStatus: 'idle',
            linkedInUrl: '',
            websiteUrl: '',
            formData: emptyFormData,
            fieldProvenance: allEmpty(emptyFormData),
            addedReferenceIds: [],
          },
          false,
          'reset'
        ),
    }),
    { name: 'OnboardingWizardStore' }
  )
)
```

### 3.9 Frontend: React Query Hooks

**`frontend/src/features/onboarding/hooks/useOnboardingProgress.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { OnboardingProgress, OnboardingFormData } from '../types/onboarding'

export const onboardingKeys = {
  progress: () => ['onboarding', 'progress'] as const,
}

interface ProgressResponse {
  progress: OnboardingProgress | null
}

export function useOnboardingProgress() {
  return useQuery<OnboardingProgress | null>({
    queryKey: onboardingKeys.progress(),
    queryFn: async () => {
      const res = await api.get<ProgressResponse>('/api/onboarding/progress')
      return res.progress
    },
    // Poll every 2s when extraction_results is null (waiting for background job)
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      // If row exists but extraction_results not yet set, poll
      if (data.extraction_results === null) return 2000
      return false
    },
  })
}

interface SaveProgressInput {
  current_step?: number
  step_data?: Partial<OnboardingFormData>
  completed_at?: string | null
}

export function useSaveOnboardingProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveProgressInput) => {
      const res = await api.put<ProgressResponse>('/api/onboarding/progress', input)
      return res.progress
    },
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.progress(), data)
    },
  })
}
```

**`frontend/src/features/onboarding/hooks/useExtractProfile.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { onboardingKeys } from './useOnboardingProgress'

interface ExtractProfileInput {
  websiteUrl?: string
  linkedInUrl?: string
  pastedText?: string
}

export function useExtractProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ExtractProfileInput) => {
      return api.post<{ message: string; status: string }>(
        '/api/onboarding/extract-profile',
        input
      )
    },
    onSuccess: () => {
      // Immediately start polling — extraction_results will be null until
      // background job completes, refetchInterval in useOnboardingProgress handles this
      queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() })
    },
  })
}
```

### 3.10 Frontend: OnboardingGate Component

**`frontend/src/components/auth/OnboardingGate.tsx`**

```typescript
import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useOnboardingProgress } from '@/features/onboarding/hooks/useOnboardingProgress'

interface OnboardingGateProps {
  children: ReactNode
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { data: progress, isLoading, error } = useOnboardingProgress()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Network error: fail open so existing users are not locked out
  if (error) {
    return <>{children}</>
  }

  // No row: new user → redirect to onboarding
  if (progress === null || progress === undefined) {
    return <Navigate to="/onboarding" replace />
  }

  // Row exists but not completed: resume onboarding
  if (!progress.completed_at) {
    return <Navigate to="/onboarding" replace />
  }

  // Completed: render the app
  return <>{children}</>
}
```

### 3.11 Frontend: App.tsx Changes

The diff to `frontend/src/App.tsx` adds two entries. The `OnboardingGate` wraps only the `AppShell` children — `ProtectedRoute` remains the outer guard unchanged.

```typescript
// Add these imports
import { OnboardingPage } from '@/features/onboarding/pages/OnboardingPage'
import { OnboardingGate } from '@/components/auth/OnboardingGate'

// In the Routes tree, after the auth routes and before the AppShell group:

{/* Onboarding route — protected but no AppShell, no OnboardingGate */}
<Route
  path="/onboarding"
  element={
    <ProtectedRoute>
      <OnboardingPage />
    </ProtectedRoute>
  }
/>

{/* Protected app routes — wrapped in AppShell + OnboardingGate */}
<Route
  element={
    <ProtectedRoute>
      <OnboardingGate>
        <AppShell />
      </OnboardingGate>
    </ProtectedRoute>
  }
>
  <Route path="/" element={<Navigate to="/portfolio" replace />} />
  {/* ...existing routes unchanged... */}
</Route>
```

### 3.12 Frontend: OnboardingPage

**`frontend/src/features/onboarding/pages/OnboardingPage.tsx`**

Reads `?step=N` from the URL. On mount, fetches server progress to hydrate the store. Redirects to `/portfolio` if already completed.

```typescript
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { WizardShell } from '../components/WizardShell'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const stepParam = parseInt(searchParams.get('step') ?? '0', 10)
  const { data: progress, isLoading } = useOnboardingProgress()
  const hydrateFromServer = useOnboardingWizardStore((s) => s.hydrateFromServer)

  // If already completed, send to app
  useEffect(() => {
    if (!isLoading && progress?.completed_at) {
      navigate('/portfolio', { replace: true })
    }
  }, [isLoading, progress, navigate])

  // Hydrate store from server data once loaded
  useEffect(() => {
    if (!isLoading && progress) {
      hydrateFromServer(
        stepParam,
        progress.step_data ?? {},
        progress.extraction_results
      )
    }
  }, [isLoading, progress])  // intentionally not re-run on stepParam change

  if (isLoading) return null // OnboardingGate already shows spinner before this mounts

  return <WizardShell />
}
```

### 3.13 Frontend: WizardShell

**`frontend/src/features/onboarding/components/WizardShell.tsx`**

Reads `?step` from URL, renders the correct step component. Handles "Skip for now" link.

```typescript
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { WelcomeStep } from './WelcomeStep'
import { ImportStep } from './ImportStep'
import { ProfileStep } from './ProfileStep'
import { MarketStep } from './MarketStep'
import { VoiceStep } from './VoiceStep'
import { CompletionStep } from './CompletionStep'

// Step numbering:
// 0 = Welcome (unnumbered)
// 1 = Import (Step 1 of 4)
// 2 = Profile (Step 2 of 4)
// 3 = Market  (Step 3 of 4)
// 4 = Voice   (Step 4 of 4)
// 5 = Completion (unnumbered)

const NUMBERED_STEPS = [1, 2, 3, 4]

export function WizardShell() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const stepParam = parseInt(searchParams.get('step') ?? '0', 10)
  const saveProgress = useSaveOnboardingProgress()

  const handleSkip = async () => {
    // Persist current step so OnboardingGate resumes here
    await saveProgress.mutateAsync({ current_step: stepParam })
    navigate('/portfolio', { replace: true })
  }

  const renderStep = () => {
    switch (stepParam) {
      case 0: return <WelcomeStep />
      case 1: return <ImportStep />
      case 2: return <ProfileStep />
      case 3: return <MarketStep />
      case 4: return <VoiceStep />
      case 5: return <CompletionStep />
      default: return <WelcomeStep />
    }
  }

  const showStepIndicator = NUMBERED_STEPS.includes(stepParam)
  const showSkip = stepParam > 0 && stepParam < 5

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-lg font-semibold">NextUp</span>
        {showSkip && (
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Progress indicator for numbered steps */}
      {showStepIndicator && (
        <div className="flex items-center justify-center gap-2 py-4">
          {NUMBERED_STEPS.map((n) => (
            <div
              key={n}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                n <= stepParam ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
          <span className="ml-3 text-xs text-muted-foreground">
            Step {stepParam} of 4
          </span>
        </div>
      )}

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {renderStep()}
      </div>
    </div>
  )
}
```

### 3.14 Frontend: ImportStep

**`frontend/src/features/onboarding/components/ImportStep.tsx`**

The critical async step. Clicking Extract fires `useExtractProfile` and immediately navigates to Step 2.

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useExtractProfile } from '../hooks/useExtractProfile'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'

export function ImportStep() {
  const navigate = useNavigate()
  const [pasteText, setPasteText] = useState('')
  const linkedInUrl = useOnboardingWizardStore((s) => s.linkedInUrl)
  const websiteUrl = useOnboardingWizardStore((s) => s.websiteUrl)
  const setLinkedInUrl = useOnboardingWizardStore((s) => s.setLinkedInUrl)
  const setWebsiteUrl = useOnboardingWizardStore((s) => s.setWebsiteUrl)
  const setExtractionStatus = useOnboardingWizardStore((s) => s.setExtractionStatus)
  const extractProfile = useExtractProfile()
  const saveProgress = useSaveOnboardingProgress()

  const hasAnyInput = linkedInUrl.trim() || websiteUrl.trim()

  const handleExtract = async () => {
    setExtractionStatus('submitted')
    // Fire extraction (returns 202 immediately)
    extractProfile.mutate({
      websiteUrl: websiteUrl.trim() || undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
    })
    // Advance immediately — Step 2 shows skeleton UI while extraction runs
    setExtractionStatus('extracting')
    await saveProgress.mutateAsync({ current_step: 2 })
    navigate('/onboarding?step=2')
  }

  const handlePasteExtract = async () => {
    if (!pasteText.trim()) return
    setExtractionStatus('submitted')
    extractProfile.mutate({ pastedText: pasteText.trim() })
    setExtractionStatus('extracting')
    await saveProgress.mutateAsync({ current_step: 2 })
    navigate('/onboarding?step=2')
  }

  const handleSkipImport = async () => {
    setExtractionStatus('skipped')
    await saveProgress.mutateAsync({ current_step: 2 })
    navigate('/onboarding?step=2')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import your profile</h1>
        <p className="text-muted-foreground mt-1">
          Let AI pre-fill your profile from your existing online presence.
        </p>
      </div>

      <Tabs defaultValue="urls">
        <TabsList>
          <TabsTrigger value="urls">URLs</TabsTrigger>
          <TabsTrigger value="paste">Paste text</TabsTrigger>
        </TabsList>

        <TabsContent value="urls" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              type="url"
              placeholder="https://yoursite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
            <Input
              id="linkedin-url"
              type="url"
              placeholder="https://linkedin.com/in/yourname"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleExtract}
              disabled={!hasAnyInput || extractProfile.isPending}
            >
              {extractProfile.isPending ? 'Starting...' : 'Extract Profile'}
            </Button>
            <button
              onClick={handleSkipImport}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip this step
            </button>
          </div>
        </TabsContent>

        <TabsContent value="paste" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="paste-text">Paste your LinkedIn bio or about section</Label>
            <Textarea
              id="paste-text"
              rows={8}
              placeholder="Paste the text from your LinkedIn About section, bio, or any professional description..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handlePasteExtract}
              disabled={!pasteText.trim() || extractProfile.isPending}
            >
              Extract Profile
            </Button>
            <button
              onClick={handleSkipImport}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Skip this step
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 3.15 Frontend: ProfileStep (Step 2 of 4)

**`frontend/src/features/onboarding/components/ProfileStep.tsx`**

Shows skeleton loading while `extractionStatus === 'extracting'`. Applies extraction results when they arrive via `useOnboardingProgress` polling. Uses `react-hook-form` with the shared Zod schemas.

```typescript
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { useOnboardingProgress } from '../hooks/useOnboardingProgress'
import { useSaveOnboardingProgress } from '../hooks/useOnboardingProgress'
import { aboutMeSchema, professionSchema, type AboutMeFormData, type ProfessionFormData } from '../schemas/userContext'
import { z } from 'zod'

const stepSchema = z.object({
  about_me: aboutMeSchema,
  profession: professionSchema,
})
type StepFormData = z.infer<typeof stepSchema>

export function ProfileStep() {
  const navigate = useNavigate()
  const formData = useOnboardingWizardStore((s) => s.formData)
  const fieldProvenance = useOnboardingWizardStore((s) => s.fieldProvenance)
  const extractionStatus = useOnboardingWizardStore((s) => s.extractionStatus)
  const applyExtractionResults = useOnboardingWizardStore((s) => s.applyExtractionResults)
  const updateField = useOnboardingWizardStore((s) => s.updateField)
  const saveProgress = useSaveOnboardingProgress()
  const { data: serverProgress } = useOnboardingProgress()

  const isExtracting = extractionStatus === 'extracting'

  const { register, handleSubmit, reset } = useForm<StepFormData>({
    resolver: zodResolver(stepSchema),
    defaultValues: {
      about_me: formData.about_me,
      profession: formData.profession,
    },
  })

  // Watch for extraction results arriving via polling
  useEffect(() => {
    if (
      serverProgress?.extraction_results &&
      !serverProgress.extraction_results.__error &&
      extractionStatus === 'extracting'
    ) {
      applyExtractionResults(serverProgress.extraction_results)
      // Reset react-hook-form with the newly populated values
      reset({
        about_me: { ...formData.about_me, ...serverProgress.extraction_results.about_me },
        profession: { ...formData.profession, ...serverProgress.extraction_results.profession },
      })
    }
  }, [serverProgress?.extraction_results])

  const onSubmit = async (data: StepFormData) => {
    await saveProgress.mutateAsync({
      current_step: 3,
      step_data: { ...formData, about_me: data.about_me, profession: data.profession },
    })
    navigate('/onboarding?step=3')
  }

  const handleBack = () => {
    navigate('/onboarding?step=1', { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground mt-1">
            {isExtracting
              ? 'AI is pre-filling your profile from your links...'
              : 'Review and edit your profile information.'}
          </p>
        </div>
        {isExtracting && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Importing...
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-base font-semibold">About Me</h2>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            {isExtracting && fieldProvenance['bio'] === 'empty' ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <Textarea
                id="bio"
                rows={3}
                placeholder="Who you are and what you do professionally."
                {...register('about_me.bio')}
                onChange={(e) => {
                  updateField('about_me', 'bio', e.target.value)
                  register('about_me.bio').onChange(e)
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value_proposition">Value Proposition</Label>
            {isExtracting && fieldProvenance['value_proposition'] === 'empty' ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <Textarea
                id="value_proposition"
                rows={2}
                placeholder="What unique value do you bring to clients?"
                {...register('about_me.value_proposition')}
                onChange={(e) => {
                  updateField('about_me', 'value_proposition', e.target.value)
                  register('about_me.value_proposition').onChange(e)
                }}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-semibold">Profession</h2>

          <div className="space-y-2">
            <Label htmlFor="expertise_areas">Expertise Areas</Label>
            {isExtracting && fieldProvenance['expertise_areas'] === 'empty' ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <Textarea
                id="expertise_areas"
                rows={3}
                placeholder="• Product Strategy&#10;• User Research&#10;• Agile/Scrum"
                {...register('profession.expertise_areas')}
                onChange={(e) => {
                  updateField('profession', 'expertise_areas', e.target.value)
                  register('profession.expertise_areas').onChange(e)
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="industries">Industries</Label>
            {isExtracting && fieldProvenance['industries'] === 'empty' ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <Textarea
                id="industries"
                rows={3}
                placeholder="• SaaS / B2B Software&#10;• FinTech"
                {...register('profession.industries')}
                onChange={(e) => {
                  updateField('profession', 'industries', e.target.value)
                  register('profession.industries').onChange(e)
                }}
              />
            )}
          </div>
        </section>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button type="submit" disabled={saveProgress.isPending}>
            {saveProgress.isPending ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

### 3.16 Frontend: MarketStep and VoiceStep (abbreviated patterns)

**`frontend/src/features/onboarding/components/MarketStep.tsx`** follows the identical pattern as `ProfileStep.tsx` but uses `customersSchema` and `goalsSchema`. It reads `formData.customers` and `formData.goals` from the store, applies extraction results for the `customers` section, and navigates to `?step=4` on submit.

**`frontend/src/features/onboarding/components/VoiceStep.tsx`** renders the inline `OnboardingReferenceUpload` component wrapped in a shadcn `Card`. It reads `addedReferenceIds` from the store. Continuing navigates to `?step=5` and calls `saveProgress`.

### 3.17 Frontend: OnboardingReferenceUpload

**`frontend/src/features/onboarding/components/OnboardingReferenceUpload.tsx`**

Reuses `useCreateWritingExample`, `useUploadWritingExample`, `useExtractFromUrl`, `useExtractPublication`, and `useWritingExamples` from `frontend/src/features/portfolio/hooks/useWritingExamples.ts`. Does not import `WritingReferencesManager`. Renders method tabs (Paste / Upload / File URL / Publication URL) inline in a `Card` with no Sheet/drawer. On successful create, calls `addReferenceId(id)`.

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileDropZone } from '@/features/portfolio/components/writing-references/FileDropZone'
import { PublicationUrlInput } from '@/features/portfolio/components/writing-references/PublicationUrlInput'
import {
  useCreateWritingExample,
  useUploadWritingExample,
  useExtractFromUrl,
  useExtractPublication,
  useWritingExamples,
} from '@/features/portfolio/hooks/useWritingExamples'
import { useOnboardingWizardStore } from '../stores/onboardingWizardStore'
import { ReferenceCard } from '@/features/portfolio/components/writing-references/ReferenceCard'
// ... (Textarea, Input, Button, Label, useToast)

export function OnboardingReferenceUpload() {
  const addReferenceId = useOnboardingWizardStore((s) => s.addReferenceId)
  const addedIds = useOnboardingWizardStore((s) => s.addedReferenceIds)
  const { data: examples = [] } = useWritingExamples()
  const createExample = useCreateWritingExample()
  const uploadExample = useUploadWritingExample()
  const extractFromUrl = useExtractFromUrl()
  const extractPublication = useExtractPublication()

  // Filter to only show references added during this session
  const sessionExamples = examples.filter((e) => addedIds.includes(e.id))

  // ... handlers for each method tab that call respective mutations
  // ... on success: addReferenceId(data.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Writing References</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add samples of your writing to personalize AI output. Optional but recommended.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing references added this session */}
        {sessionExamples.map((ex) => (
          <ReferenceCard key={ex.id} example={ex} onDelete={() => {}} />
        ))}

        {/* Upload tabs */}
        <Tabs defaultValue="paste">
          <TabsList>
            <TabsTrigger value="paste">Paste</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">File URL</TabsTrigger>
            <TabsTrigger value="publication">Publication</TabsTrigger>
          </TabsList>
          {/* ... tab content for each method */}
        </Tabs>
      </CardContent>
    </Card>
  )
}
```

### 3.18 Frontend: CompletionStep

**`frontend/src/features/onboarding/components/CompletionStep.tsx`**

On mount, calls `saveProgress({ completed_at: new Date().toISOString() })` and `useUpdateUserContext` with `formData` from the store (so profile fields flow into `user_context`). Shows a simple celebration screen with a "Go to my portfolio" button that navigates to `/portfolio` and calls `queryClient.invalidateQueries({ queryKey: onboardingKeys.progress() })`.

The `useUpdateUserContext` mutation is imported from `frontend/src/features/portfolio/hooks/useUserContext.ts` — no new code required.

### 3.19 Frontend: PortfolioPage Empty-State Card

When `progress !== null && !progress.completed_at`, render a card above the artifact list:

```typescript
// In PortfolioPage.tsx, use useOnboardingProgress()
// Show only when: data is loaded, progress exists, no completed_at
{progress && !progress.completed_at && (
  <Card className="mb-6 border-primary/20 bg-primary/5">
    <CardContent className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium">Complete your profile setup</p>
        <p className="text-sm text-muted-foreground">
          Help AI personalize your content by finishing the setup wizard.
        </p>
      </div>
      <Button asChild>
        <Link to="/onboarding">Resume Setup</Link>
      </Button>
    </CardContent>
  </Card>
)}
```

---

## 4. Data Model

### SQL Migration

Apply via `mcp__supabase__apply_migration` with name `add_onboarding_progress`:

```sql
-- ============================================================================
-- Migration: add_onboarding_progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Wizard position
  current_step  INTEGER NOT NULL DEFAULT 0,

  -- Written ONLY by the extraction background job (POST /api/onboarding/extract-profile)
  -- Schema matches ExtractedProfileFields interface
  extraction_results  JSONB DEFAULT NULL,

  -- Written ONLY by auto-save and "Save & Continue" (PUT /api/onboarding/progress)
  -- Schema matches Partial<OnboardingFormData> interface
  step_data     JSONB NOT NULL DEFAULT '{}',

  -- NULL = incomplete / skipped; non-null = fully completed wizard
  completed_at  TIMESTAMPTZ DEFAULT NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT onboarding_progress_user_id_unique UNIQUE (user_id)
);

-- Index for the OnboardingGate lookup (hot path on every page load)
CREATE INDEX IF NOT EXISTS onboarding_progress_user_id_idx
  ON public.onboarding_progress(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_onboarding_progress_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "onboarding_progress: users can read own row"
  ON public.onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own row
CREATE POLICY "onboarding_progress: users can insert own row"
  ON public.onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their OWN row BUT NOT extraction_results
-- extraction_results is written only by the backend service role
CREATE POLICY "onboarding_progress: users can update own row (no extraction_results)"
  ON public.onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Prevent RLS bypass: users cannot change extraction_results
    -- (service role bypasses RLS; the controller uses supabaseAdmin)
  );

-- Note: The backend onboarding controller uses getSupabase() which is the
-- user-scoped client for step_data/current_step writes.
-- The background extraction job in extractProfile calls getSupabase() after
-- the 202 response. Since the controller still runs in the AsyncLocalStorage
-- context at that point, this is safe. If extraction is moved to a worker,
-- switch to supabaseAdmin for that write.
```

### RLS Write Separation Strategy

The `extraction_results` column isolation is enforced through two mechanisms:

1. **Application layer**: The `saveProgress` endpoint only writes `current_step`, `step_data`, and `completed_at`. It never touches `extraction_results`. The `extractProfile` endpoint only writes `extraction_results`. This is structural — the Zod schemas for each endpoint exclude the other column.

2. **Service role boundary**: The `extractProfile` background job runs within the same AsyncLocalStorage context as the request (same user JWT client), writing only `extraction_results`. If the write needed service-role bypass, `supabaseAdmin` from `backend/src/lib/supabase.ts` would be used.

---

## 5. API Design

### GET /api/onboarding/progress

Returns the current user's onboarding row, or null if no row exists.

**Response 200:**
```json
{
  "progress": {
    "id": "uuid",
    "user_id": "uuid",
    "current_step": 2,
    "extraction_results": null,
    "step_data": {
      "about_me": { "bio": "..." }
    },
    "completed_at": null,
    "created_at": "2026-03-02T10:00:00Z",
    "updated_at": "2026-03-02T10:01:00Z"
  }
}
```

When no row exists: `{ "progress": null }`

### PUT /api/onboarding/progress

Upserts progress. Does not accept `extraction_results`.

**Request body:**
```json
{
  "current_step": 3,
  "step_data": {
    "about_me": {
      "bio": "Fractional CPO helping B2B SaaS startups",
      "value_proposition": "I bridge product and engineering"
    },
    "profession": {
      "expertise_areas": "• Product Strategy\n• User Research"
    }
  }
}
```

**Response 200:** Same shape as GET response.

**To mark complete:**
```json
{ "completed_at": "2026-03-02T10:15:00Z" }
```

### POST /api/onboarding/extract-profile

Starts background profile extraction. Returns immediately.

**Request body (at least one field required):**
```json
{
  "websiteUrl": "https://janesmith.consulting",
  "linkedInUrl": "https://linkedin.com/in/janesmith",
  "pastedText": "optional paste text"
}
```

**Response 202:**
```json
{
  "message": "Extraction started",
  "status": "extracting"
}
```

Frontend polls `GET /api/onboarding/progress` until `extraction_results` is non-null (max 15s with 2s interval = ~7 polls).

**When extraction completes**, subsequent `GET /api/onboarding/progress` returns:
```json
{
  "progress": {
    "extraction_results": {
      "about_me": {
        "bio": "Jane Smith is a fractional CPO...",
        "value_proposition": "Building product orgs from 0-1"
      },
      "profession": {
        "expertise_areas": "• Product Strategy\n• OKR Frameworks",
        "industries": "• B2B SaaS\n• FinTech"
      },
      "customers": {
        "target_audience": "Series A-B SaaS startups",
        "ideal_client": "CTO/CEO of 10-50 person company"
      }
    }
  }
}
```

**On extraction failure**, `extraction_results` is set to `{ "__error": true, "__message": "Extraction failed" }`. Frontend detects `__error: true` and shows an inline error in Step 2 without blocking progress.

---

## 6. State Shape

Definitive Zustand store type (see Section 3.8 for full implementation):

```typescript
type ExtractionStatus =
  | 'idle'       // No extraction attempted
  | 'submitted'  // HTTP call in flight
  | 'extracting' // 202 received, background job running
  | 'complete'   // extraction_results arrived, applied to formData
  | 'failed'     // extraction_results.__error = true
  | 'timeout'    // 15s elapsed without results (UI shows fallback)
  | 'skipped'    // User clicked "Skip this step"

type FieldProvenance = 'ai' | 'user' | 'empty'

interface OnboardingWizardStore {
  // Navigation
  currentStep: number

  // Extraction lifecycle
  extractionStatus: ExtractionStatus

  // URL inputs (persisted in store only, not in DB step_data)
  linkedInUrl: string
  websiteUrl: string

  // Form state (hydrated from server step_data + extraction_results)
  formData: OnboardingFormData
  fieldProvenance: Record<string, FieldProvenance>

  // Reference tracking (Step 4)
  addedReferenceIds: string[]

  // Actions
  setStep(step: number): void
  setExtractionStatus(status: ExtractionStatus): void
  setLinkedInUrl(url: string): void
  setWebsiteUrl(url: string): void
  updateField<S extends keyof OnboardingFormData, F extends keyof OnboardingFormData[S]>(
    section: S, field: F, value: OnboardingFormData[S][F]
  ): void
  applyExtractionResults(results: ExtractedProfileFields): void
  addReferenceId(id: string): void
  removeReferenceId(id: string): void
  hydrateFromServer(
    step: number,
    stepData: Partial<OnboardingFormData>,
    extractionResults: ExtractedProfileFields | null
  ): void
  reset(): void
}
```

---

## 7. Testing Requirements

### Unit Tests

| File | Test |
|------|------|
| `backend/src/services/ProfileExtractionService.ts` | `stripFences()` removes both ` ```json ` and ` ``` ` fences; returns empty object when Claude returns invalid JSON; returns empty object when fetch fails |
| `frontend/src/features/onboarding/stores/onboardingWizardStore.ts` | `applyExtractionResults` respects provenance merge policy: 'user' fields are never overwritten; 'empty' fields accept AI values; 'ai' fields accept updated values |
| `frontend/src/features/onboarding/stores/onboardingWizardStore.ts` | `hydrateFromServer` builds correct provenance from non-empty step_data fields |
| `frontend/src/components/auth/OnboardingGate.tsx` | Renders spinner while loading; redirects to `/onboarding` when `progress === null`; redirects to `/onboarding` when `completed_at` is null; renders children when `completed_at` is set; renders children when query errors |

### Integration Tests (Backend)

| Scenario | Test |
|----------|------|
| `GET /api/onboarding/progress` with no row | Returns `{ progress: null }` |
| `PUT /api/onboarding/progress` creates new row | Returns row with correct step and step_data |
| `PUT /api/onboarding/progress` updates existing row | Merges step_data without overwriting extraction_results |
| `POST /api/onboarding/extract-profile` with no input | Returns 400 |
| `POST /api/onboarding/extract-profile` with websiteUrl | Returns 202 and sets extraction_results asynchronously |
| `POST /api/onboarding/extract-profile` unauthenticated | Returns 401 |

### Manual Test Checklist

**New user flow:**
- [ ] New account (no `onboarding_progress` row): visiting `/portfolio` redirects to `/onboarding`
- [ ] Welcome screen shows, "Get Started" navigates to `?step=1`
- [ ] Entering website URL and clicking Extract: immediately advances to Step 2
- [ ] Step 2 shows skeleton placeholders while `extractionStatus === 'extracting'`
- [ ] After ~5-10s, fields populate from extraction results
- [ ] Fields already typed by user are NOT overwritten by extraction
- [ ] "Back" button uses browser history (no forward-stack loop)
- [ ] "Skip for now" from any step: redirects to portfolio, shows resume card
- [ ] Completing Step 5: `completed_at` is set, `useUpdateUserContext` is called
- [ ] After completion: `/portfolio` no longer shows the resume card
- [ ] After completion: visiting `/onboarding` directly redirects to `/portfolio`

**Existing user (completed onboarding):**
- [ ] No redirect on portfolio load
- [ ] `OnboardingGate` renders `AppShell` directly

**Extraction failure path:**
- [ ] If extraction fails (network error, Claude error): `extraction_results.__error = true`
- [ ] Step 2 shows inline warning and clears skeleton placeholders
- [ ] User can manually fill fields and continue
- [ ] 15s timeout: `extractionStatus` transitions to `timeout`, skeletons replaced with empty inputs

---

## 8. Error Handling

| Error | Surface | Handling |
|-------|---------|---------|
| OnboardingGate: network error fetching progress | `OnboardingGate` | Fail open — render `children` (existing users not locked out) |
| extractProfile: 400 (no input) | ImportStep | Show toast "Please enter at least one URL" |
| extractProfile: 429 (rate limit) | ImportStep | Show toast "Too many requests, please wait a minute" |
| extractProfile: 500 | ImportStep | Navigate to Step 2 anyway; `extractionStatus` = 'failed'; user fills manually |
| Website fetch 403/404 during extraction | Background job | Fall through to LinkedIn URL; if both fail, return empty object |
| LinkedIn fetch blocked (JS-only) | Background job | Silently fall through; extraction_results = `{}` (not `__error`) |
| Claude returns invalid JSON | ProfileExtractionService | `JSON.parse` throws → log error → return `{}` |
| Claude returns `__error` marker | ProfileStep | Show yellow banner "Profile import failed — please fill in manually" |
| saveProgress mutation fails | WizardShell | Show toast "Failed to save progress"; allow retry |
| `completed_at` write fails on CompletionStep | CompletionStep | Show toast; "Go to portfolio" button still works (gate checks DB) |

---

## 9. Validation Commands

After implementation, run these commands to verify correctness:

```bash
# TypeScript compilation — no errors
cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend
npm run build

cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/backend
npm run build

# Unit tests
cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend
npm test

# API health check
curl http://localhost:3001/api/health

# Onboarding migration check
# Run via mcp__supabase__list_migrations to confirm "add_onboarding_progress" applied
```

---

## 10. Open Items

| # | Item | Decision Required By |
|---|------|---------------------|
| 1 | **Extraction timeout UX**: After 15s with no `extraction_results`, should skeletons become empty editable inputs (recommended) or show an inline retry button? | Implementation start |
| 2 | **user_context write on completion**: `CompletionStep` calls `useUpdateUserContext` to write `formData` to the `user_context` table. If that table has an existing row (unlikely for new users but possible), the mutation merges sections shallowly. Confirm the merge behavior is acceptable. | Implementation start |
| 3 | **LinkedIn bot detection**: LinkedIn actively blocks server-side fetch requests. The service degrades gracefully to empty results when LinkedIn blocks. Phase 2 could add a Puppeteer/Playwright headless fallback. For Phase 1 the paste-text fallback is the reliable path for LinkedIn. | Accepted, no action needed for Phase 1 |
| 4 | **Re-onboarding path**: There is currently no "Redo setup wizard" option in Settings. This can be added in Phase 2 by setting `completed_at = null` via a new endpoint. | Phase 2 |
| 5 | **Mobile layout**: WizardShell uses `max-w-2xl mx-auto`. Full mobile responsiveness is required by NFRs but not animated/polished until Phase 2. The layout is functional on mobile with standard Tailwind responsive classes. | Implementation |

---

*This spec was generated from exhaustive codebase analysis and represents all file paths, patterns, and architectural decisions grounded in the actual state of the repository as of 2026-03-02.*
