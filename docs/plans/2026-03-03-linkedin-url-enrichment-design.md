# LinkedIn URL Enrichment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add LinkedIn URL field to New Customer dialog that auto-populates form fields via Tavily + Haiku enrichment, and display ICP Score on customer detail page.

**Architecture:** New backend endpoint `POST /api/customers/enrich-from-linkedin` accepts a LinkedIn URL (company or person), searches via Tavily, extracts structured data with Claude Haiku, returns it to frontend. Frontend debounces on paste/blur, shows spinners on fields while loading, then populates form. Existing `enrichAndScoreNewCustomer` fire-and-forget handles ICP scoring post-creation.

**Tech Stack:** Express + Zod (backend), React Hook Form + TanStack Query (frontend), Tavily + Vercel AI SDK + Claude Haiku (enrichment), existing EnrichmentService patterns.

---

## Task 1: Backend — LinkedIn Enrichment Service Method

**Files:**
- Modify: `backend/src/services/EnrichmentService.ts`

**Step 1: Add the `enrichFromLinkedInUrl` method to EnrichmentService**

Add a new public method that takes a LinkedIn URL, detects type (company vs person), searches via Tavily, and extracts structured data using Haiku. Add a new system prompt constant and response type.

```typescript
// Add to types section at top of file

export interface LinkedInEnrichmentResult {
  type: 'company' | 'person'
  name: string
  about: string
  vertical: string
  enrichment: CompanyEnrichmentData
  team_member?: {
    name: string
    role?: string
    linkedin_url: string
  }
  linkedin_company_url?: string
}

// Add new constant after existing prompts

const LINKEDIN_URL_SYSTEM_PROMPT = `You are a business data assistant. Extract structured data from web search results about a LinkedIn profile or company page.

Return ONLY a JSON object with these fields:
- "type": "company" or "person" — based on the URL type
- "name": string — company name (if company URL) or the person's company name (if person URL)
- "about": string — brief company description (max 300 characters)
- "vertical": string — primary industry (e.g., "Software Development", "Financial Services")
- "employee_count": string — approximate employee count range (e.g., "51-200", "1001-5000")
- "industry": string — primary industry
- "specialties": array of strings — up to 5 key specialties or focus areas
- "person_name": string or null — the person's full name (only for person URLs, null for companies)
- "person_role": string or null — the person's job title (only for person URLs, null for companies)

Extract ONLY from the provided search context. If insufficient data, use empty string/array.
Return ONLY valid JSON, no markdown fences.`

// Add new method to EnrichmentService class

async enrichFromLinkedInUrl(linkedinUrl: string): Promise<LinkedInEnrichmentResult | null> {
  const isCompany = linkedinUrl.includes('/company/')
  const isPerson = linkedinUrl.includes('/in/')

  if (!isCompany && !isPerson) return null
  if (!tavilyClient.isConfigured()) return null

  try {
    // Search Tavily with the LinkedIn URL
    const [linkedinResults, webResults] = await Promise.all([
      tavilyClient.search(linkedinUrl, {
        includeDomains: ['linkedin.com'],
        maxResults: 3,
        includeRawContent: false,
      }),
      tavilyClient.search(`${linkedinUrl} company about employees`, {
        excludeDomains: ['linkedin.com'],
        maxResults: 3,
        includeRawContent: false,
      }),
    ])

    const allResults = [...linkedinResults, ...webResults]
      .filter(r => r.score >= MIN_TAVILY_SCORE)

    if (allResults.length === 0) return null

    let context = ''
    for (const r of allResults) {
      const entry = `${r.title}\n${r.content}\n\n`
      if (context.length + entry.length > MAX_CONTEXT_LENGTH) break
      context += entry
    }

    if (context.length < MIN_CONTEXT_LENGTH) return null

    const { text } = await generateText({
      model: anthropic(ENRICHMENT_MODEL),
      system: LINKEDIN_URL_SYSTEM_PROMPT,
      prompt: `LinkedIn URL: ${linkedinUrl}\nURL Type: ${isCompany ? 'company' : 'person'}\n\nSearch Results:\n${context}`,
      maxOutputTokens: 500,
    })

    // Parse response
    let jsonText = text.trim()
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) jsonText = fenceMatch[1].trim()

    const parsed = JSON.parse(jsonText) as Record<string, unknown>
    if (!parsed || Object.keys(parsed).length === 0) return null

    const result: LinkedInEnrichmentResult = {
      type: isCompany ? 'company' : 'person',
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 200) : '',
      about: typeof parsed.about === 'string' ? parsed.about.slice(0, MAX_ABOUT_LENGTH) : '',
      vertical: typeof parsed.vertical === 'string' || typeof parsed.industry === 'string'
        ? ((parsed.vertical || parsed.industry) as string).slice(0, 100)
        : '',
      enrichment: {
        employee_count: typeof parsed.employee_count === 'string' ? parsed.employee_count.slice(0, 50) : '',
        about: typeof parsed.about === 'string' ? parsed.about.slice(0, MAX_ABOUT_LENGTH) : '',
        industry: typeof parsed.industry === 'string' ? parsed.industry.slice(0, 100) : '',
        specialties: Array.isArray(parsed.specialties)
          ? parsed.specialties.filter((s: unknown) => typeof s === 'string').slice(0, MAX_SPECIALTIES).map((s: string) => s.slice(0, 100))
          : [],
      },
    }

    // Add linkedin_company_url for company pages
    if (isCompany) {
      result.linkedin_company_url = linkedinUrl
    }

    // For person URLs, extract team member
    if (isPerson && typeof parsed.person_name === 'string' && parsed.person_name) {
      result.team_member = {
        name: parsed.person_name.slice(0, 200),
        role: typeof parsed.person_role === 'string' ? parsed.person_role.slice(0, 200) : undefined,
        linkedin_url: linkedinUrl,
      }
    }

    if (!result.name && !result.about && !result.vertical) return null

    return result
  } catch (error) {
    logger.error('[EnrichmentService] LinkedIn URL enrichment failed', {
      hasError: true,
      urlType: isCompany ? 'company' : 'person',
    })
    return null
  }
}
```

**Step 2: Verify backend builds**

Run: `cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/backend && npx tsc --noEmit`
Expected: Clean compilation, no errors.

**Step 3: Commit**

```bash
git add backend/src/services/EnrichmentService.ts
git commit -m "feat(enrichment): add enrichFromLinkedInUrl method for URL-based enrichment"
```

---

## Task 2: Backend — Controller + Route

**Files:**
- Modify: `backend/src/controllers/customer.controller.ts`
- Modify: `backend/src/routes/customers.ts`

**Step 1: Add controller handler**

Add to `customer.controller.ts` after the existing handlers section:

```typescript
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
```

**Step 2: Add route**

Add to `backend/src/routes/customers.ts` BEFORE the `/:id` routes (to avoid route collision):

```typescript
// LinkedIn URL enrichment (must come BEFORE /:id to avoid route collision)
router.post('/enrich-from-linkedin', customerController.enrichFromLinkedIn)
```

**Step 3: Verify backend builds**

Run: `cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/backend && npx tsc --noEmit`
Expected: Clean compilation.

**Step 4: Commit**

```bash
git add backend/src/controllers/customer.controller.ts backend/src/routes/customers.ts
git commit -m "feat(api): add POST /api/customers/enrich-from-linkedin endpoint"
```

---

## Task 3: Frontend — Enrichment Hook

**Files:**
- Create: `frontend/src/features/customers/hooks/useLinkedInEnrichment.ts`
- Modify: `frontend/src/features/customers/hooks/index.ts`

**Step 1: Create the hook**

```typescript
/**
 * useLinkedInEnrichment
 *
 * Calls backend to enrich customer data from a LinkedIn URL.
 * Returns mutation for on-demand enrichment with loading state.
 */

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CompanyEnrichmentData, TeamMember } from '../types/customer'

interface LinkedInEnrichmentResponse {
  enriched: boolean
  message?: string
  type?: 'company' | 'person'
  name?: string
  about?: string
  vertical?: string
  enrichment?: CompanyEnrichmentData
  team_member?: {
    name: string
    role?: string
    linkedin_url: string
  }
  linkedin_company_url?: string
}

export function useLinkedInEnrichment() {
  return useMutation({
    mutationFn: async (linkedinUrl: string) => {
      return api.post<LinkedInEnrichmentResponse>('/api/customers/enrich-from-linkedin', {
        linkedin_url: linkedinUrl,
      })
    },
  })
}
```

**Step 2: Export from hooks index**

Add to `frontend/src/features/customers/hooks/index.ts`:

```typescript
export { useLinkedInEnrichment } from './useLinkedInEnrichment'
```

**Step 3: Verify frontend builds**

Run: `cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend && npx tsc --noEmit`
Expected: Clean compilation.

**Step 4: Commit**

```bash
git add frontend/src/features/customers/hooks/useLinkedInEnrichment.ts frontend/src/features/customers/hooks/index.ts
git commit -m "feat(hooks): add useLinkedInEnrichment mutation hook"
```

---

## Task 4: Frontend — Update NewCustomerDialog

**Files:**
- Modify: `frontend/src/features/customers/components/forms/NewCustomerDialog.tsx`

**Step 1: Add LinkedIn URL field with enrichment integration**

Replace the entire file content. Key changes:
- Add `linkedin_url` field at top of form
- On paste/blur → debounce 500ms → call `useLinkedInEnrichment`
- Show `<Spinner>` on Name, Vertical, About fields while `isPending`
- Auto-populate fields from response using `form.setValue`
- Store enrichment data + team member in local state for submit
- Pass enrichment data + linkedin_company_url + team member in `info` on create

```typescript
/**
 * New Customer Dialog
 *
 * Dialog for creating a new customer. Supports LinkedIn URL enrichment:
 * paste a LinkedIn URL to auto-populate company fields.
 */

import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Linkedin } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateCustomer, useLinkedInEnrichment } from '../../hooks'
import { CustomerStatusSelect } from '../shared/CustomerStatusSelect'
import type { CustomerStatus, CustomerInfo } from '../../types'

const newCustomerSchema = z.object({
  linkedin_url: z.string().optional(),
  name: z.string().min(1, 'Customer name is required').max(200),
  vertical: z.string().optional(),
  about: z.string().optional(),
})

type NewCustomerFormData = z.infer<typeof newCustomerSchema>

interface NewCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewCustomerDialog({ open, onOpenChange }: NewCustomerDialogProps) {
  const navigate = useNavigate()
  const createCustomer = useCreateCustomer()
  const enrichment = useLinkedInEnrichment()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Store enrichment extras that don't map to form fields
  const [enrichmentData, setEnrichmentData] = useState<CustomerInfo['enrichment'] | undefined>()
  const [teamMember, setTeamMember] = useState<CustomerInfo['team']>()
  const [linkedinCompanyUrl, setLinkedinCompanyUrl] = useState<string | undefined>()

  const form = useForm<NewCustomerFormData>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { linkedin_url: '', name: '', vertical: '', about: '' },
  })

  const statusValue: CustomerStatus = 'lead'

  const triggerEnrichment = useCallback((url: string) => {
    // Validate it looks like a LinkedIn URL
    if (!url.includes('linkedin.com/company/') && !url.includes('linkedin.com/in/')) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      enrichment.mutate(url, {
        onSuccess: (data) => {
          if (!data.enriched) {
            toast({ title: 'Could not extract data from this LinkedIn URL', variant: 'destructive' })
            return
          }

          // Auto-populate form fields (only if currently empty)
          if (data.name && !form.getValues('name')) {
            form.setValue('name', data.name, { shouldValidate: true })
          }
          if (data.vertical && !form.getValues('vertical')) {
            form.setValue('vertical', data.vertical)
          }
          if (data.about && !form.getValues('about')) {
            form.setValue('about', data.about)
          }

          // Store enrichment extras
          if (data.enrichment) {
            setEnrichmentData({
              ...data.enrichment,
              source: 'tavily_grounded',
              updated_at: new Date().toISOString(),
            })
          }
          if (data.team_member) {
            setTeamMember([data.team_member])
          }
          if (data.linkedin_company_url) {
            setLinkedinCompanyUrl(data.linkedin_company_url)
          }

          toast({ title: 'LinkedIn data loaded' })
        },
        onError: () => {
          toast({ title: 'Failed to fetch LinkedIn data', variant: 'destructive' })
        },
      })
    }, 500)
  }, [enrichment, form])

  const handleLinkedInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    form.setValue('linkedin_url', url)
    if (url) triggerEnrichment(url)
  }

  const handleSubmit = async (data: NewCustomerFormData) => {
    try {
      const info: Partial<CustomerInfo> = {
        vertical: data.vertical || undefined,
        about: data.about || undefined,
      }

      // Include enrichment data from LinkedIn scrape
      if (enrichmentData) info.enrichment = enrichmentData
      if (teamMember) info.team = teamMember
      if (linkedinCompanyUrl) info.linkedin_company_url = linkedinCompanyUrl

      const customer = await createCustomer.mutateAsync({
        name: data.name,
        status: statusValue,
        info,
      })

      toast({ title: 'Customer created', description: `${customer.name} has been added.` })

      // Reset state
      form.reset()
      setEnrichmentData(undefined)
      setTeamMember(undefined)
      setLinkedinCompanyUrl(undefined)

      onOpenChange(false)
      navigate(`/customers/${customer.id}`)
    } catch {
      toast({ title: 'Failed to create customer', variant: 'destructive' })
    }
  }

  const isEnriching = enrichment.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          {/* LinkedIn URL — top of form */}
          <div>
            <Label htmlFor="linkedin-url" className="flex items-center gap-1.5">
              <Linkedin className="h-3.5 w-3.5" />
              LinkedIn URL
            </Label>
            <Input
              id="linkedin-url"
              placeholder="https://linkedin.com/company/... or /in/..."
              className="mt-1"
              autoFocus
              onChange={handleLinkedInChange}
              onPaste={(e) => {
                // Trigger enrichment immediately on paste
                setTimeout(() => {
                  const url = (e.target as HTMLInputElement).value.trim()
                  if (url) triggerEnrichment(url)
                }, 0)
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste a LinkedIn URL to auto-fill details
            </p>
          </div>

          {/* Name */}
          <div className="relative">
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              {...form.register('name')}
              placeholder="Company or client name"
              className="mt-1"
              disabled={isEnriching}
            />
            {isEnriching && (
              <div className="absolute right-3 top-[2.1rem]">
                <Spinner size="sm" />
              </div>
            )}
            {form.formState.errors.name && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <div className="mt-1">
              <CustomerStatusSelect
                value={statusValue}
                onValueChange={() => {}}
                disabled
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">New customers start as Lead.</p>
          </div>

          {/* Vertical / Industry */}
          <div className="relative">
            <Label htmlFor="customer-vertical">Vertical / Industry</Label>
            <Input
              id="customer-vertical"
              {...form.register('vertical')}
              placeholder="e.g., SaaS, Healthcare, FinTech"
              className="mt-1"
              disabled={isEnriching}
            />
            {isEnriching && (
              <div className="absolute right-3 top-[2.1rem]">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* About */}
          <div className="relative">
            <Label htmlFor="customer-about">About</Label>
            <Textarea
              id="customer-about"
              {...form.register('about')}
              placeholder="Brief description of the customer"
              rows={3}
              className="mt-1"
              disabled={isEnriching}
            />
            {isEnriching && (
              <div className="absolute right-3 top-[2.1rem]">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCustomer.isPending || isEnriching}>
              {createCustomer.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Verify frontend builds**

Run: `cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend && npx tsc --noEmit`
Expected: Clean compilation.

**Step 3: Commit**

```bash
git add frontend/src/features/customers/components/forms/NewCustomerDialog.tsx
git commit -m "feat(dialog): add LinkedIn URL enrichment to New Customer dialog"
```

---

## Task 5: Frontend — Add ICP Score to Customer Detail Page

**Files:**
- Modify: `frontend/src/features/customers/components/overview/CustomerInfoSection.tsx`

**Step 1: Add ICP Score badge to view mode**

Import `IcpScoreBadge` and display it in the CustomerInfoSection header area, next to the "Customer Information" title. It should show in both view and edit mode.

Add import:
```typescript
import { IcpScoreBadge } from '../shared/IcpScoreBadge'
import type { IcpScore } from '../../types'
```

In the view mode (`!isEditing` branch), add the badge next to the title:
```typescript
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
    <IcpScoreBadge score={(info.icp_score as IcpScore) ?? null} />
  </div>
  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1">
    <Pencil className="h-3 w-3" />
    Edit
  </Button>
</div>
```

Do the same in the edit mode (form) header:
```typescript
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
    <IcpScoreBadge score={(info.icp_score as IcpScore) ?? null} />
  </div>
  {/* ... existing save/cancel buttons ... */}
</div>
```

**Step 2: Verify frontend builds**

Run: `cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper/frontend && npx tsc --noEmit`
Expected: Clean compilation.

**Step 3: Commit**

```bash
git add frontend/src/features/customers/components/overview/CustomerInfoSection.tsx
git commit -m "feat(ui): display ICP score badge on customer detail page"
```

---

## Task 6: Verification — Full Build + Manual Test

**Step 1: Run full build**

Run: `cd /Users/kobiagi/Desktop/Development/Product_Consultant_Helper && npm run build`
Expected: Both frontend and backend build successfully.

**Step 2: Manual smoke test with Playwright**

1. Navigate to `/customers`
2. Click "+ New Customer"
3. Verify LinkedIn URL field appears at top
4. Paste a LinkedIn company URL (e.g., `https://linkedin.com/company/microsoft`)
5. Verify spinner appears on Name, Vertical, About fields
6. Verify fields auto-populate after enrichment completes
7. Submit the form
8. Verify customer detail page shows ICP Score badge (after background scoring completes)

**Step 3: Final commit if any fixes needed**
