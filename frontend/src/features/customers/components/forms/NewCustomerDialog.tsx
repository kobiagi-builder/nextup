/**
 * New Customer Dialog
 *
 * Dialog for creating a new customer. Supports URL enrichment:
 * paste a LinkedIn URL or company website URL to auto-populate fields.
 */

import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Linkedin, Globe } from 'lucide-react'
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
import { useCreateCustomer, useLinkedInEnrichment, useWebsiteEnrichment } from '../../hooks'
import { CustomerStatusPill } from '../shared/CustomerStatusPill'
import { IcpScorePill } from '../shared/IcpScorePill'
import type { CustomerStatus, CustomerInfo, IcpScore } from '../../types'

const newCustomerSchema = z.object({
  linkedin_url: z.string().optional(),
  website_url: z.string().optional(),
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
  const websiteEnrichment = useWebsiteEnrichment()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const websiteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Store enrichment extras that don't map to form fields
  const [enrichmentData, setEnrichmentData] = useState<CustomerInfo['enrichment'] | undefined>()
  const [teamMember, setTeamMember] = useState<CustomerInfo['team']>()
  const [linkedinCompanyUrl, setLinkedinCompanyUrl] = useState<string | undefined>()
  const [websiteUrl, setWebsiteUrl] = useState<string | undefined>()
  const [icpScore, setIcpScore] = useState<IcpScore | null>(null)

  const form = useForm<NewCustomerFormData>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: { linkedin_url: '', website_url: '', name: '', vertical: '', about: '' },
  })

  const statusValue: CustomerStatus = 'lead'

  const triggerEnrichment = useCallback((url: string) => {
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

  const triggerWebsiteEnrichment = useCallback((url: string) => {
    try { new URL(url) } catch { return }

    if (websiteDebounceRef.current) clearTimeout(websiteDebounceRef.current)

    websiteDebounceRef.current = setTimeout(() => {
      websiteEnrichment.mutate(url, {
        onSuccess: (data) => {
          if (!data.enriched) {
            toast({ title: 'Could not extract data from this website', variant: 'destructive' })
            return
          }

          if (data.name && !form.getValues('name')) {
            form.setValue('name', data.name, { shouldValidate: true })
          }
          if (data.vertical && !form.getValues('vertical')) {
            form.setValue('vertical', data.vertical)
          }
          if (data.about && !form.getValues('about')) {
            form.setValue('about', data.about)
          }

          if (data.enrichment && !enrichmentData) {
            setEnrichmentData({
              ...data.enrichment,
              source: 'tavily_grounded',
              updated_at: new Date().toISOString(),
            })
          }

          setWebsiteUrl(url)
          toast({ title: 'Website data loaded' })
        },
        onError: () => {
          toast({ title: 'Failed to fetch website data', variant: 'destructive' })
        },
      })
    }, 500)
  }, [websiteEnrichment, form, enrichmentData])

  const handleLinkedInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    form.setValue('linkedin_url', url)
    if (url) triggerEnrichment(url)
  }

  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    form.setValue('website_url', url)
    if (url) triggerWebsiteEnrichment(url)
  }

  const handleSubmit = async (data: NewCustomerFormData) => {
    try {
      const info: Partial<CustomerInfo> = {
        vertical: data.vertical || undefined,
        about: data.about || undefined,
      }

      // Include ICP score if set
      if (icpScore) info.icp_score = icpScore

      // Include enrichment data from scraping
      if (enrichmentData) info.enrichment = enrichmentData
      if (teamMember) info.team = teamMember
      if (linkedinCompanyUrl) info.linkedin_company_url = linkedinCompanyUrl
      if (websiteUrl) info.website_url = websiteUrl

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
      setWebsiteUrl(undefined)
      setIcpScore(null)

      onOpenChange(false)
      navigate(`/customers/${customer.id}`)
    } catch {
      toast({ title: 'Failed to create customer', variant: 'destructive' })
    }
  }

  const isEnriching = enrichment.isPending || websiteEnrichment.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-portal-ignore-click-outside className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-2">
          {/* Name — hero field (only required) */}
          <div className="relative space-y-2">
            <Label htmlFor="customer-name">Name *</Label>
            <Input
              id="customer-name"
              {...form.register('name')}
              placeholder="Company or client name"
              autoFocus
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

          {/* URLs — side by side enrichment triggers */}
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin-url" className="flex items-center gap-1.5">
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn URL
                </Label>
                <Input
                  id="linkedin-url"
                  placeholder="linkedin.com/company/..."
                  onChange={handleLinkedInChange}
                  onPaste={(e) => {
                    setTimeout(() => {
                      const url = (e.target as HTMLInputElement).value.trim()
                      if (url) triggerEnrichment(url)
                    }, 0)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website-url" className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Website URL
                </Label>
                <Input
                  id="website-url"
                  placeholder="https://company.com"
                  onChange={handleWebsiteChange}
                  onPaste={(e) => {
                    setTimeout(() => {
                      const url = (e.target as HTMLInputElement).value.trim()
                      if (url) triggerWebsiteEnrichment(url)
                    }, 0)
                  }}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Paste URLs to auto-fill company details
            </p>
          </div>

          {/* Status + ICP Score — compact metadata row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div>
                <CustomerStatusPill status={statusValue} />
              </div>
              <p className="text-xs text-muted-foreground">Always starts as Lead</p>
            </div>
            <div className="space-y-2">
              <Label>ICP Score</Label>
              <div>
                <IcpScorePill score={icpScore} onScoreChange={setIcpScore} />
              </div>
            </div>
          </div>

          {/* Vertical / Industry */}
          <div className="relative space-y-2">
            <Label htmlFor="customer-vertical">Vertical / Industry</Label>
            <Input
              id="customer-vertical"
              {...form.register('vertical')}
              placeholder="e.g., SaaS, Healthcare, FinTech"
              disabled={isEnriching}
            />
            {isEnriching && (
              <div className="absolute right-3 top-[2.1rem]">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* About */}
          <div className="relative space-y-2">
            <Label htmlFor="customer-about">About</Label>
            <Textarea
              id="customer-about"
              {...form.register('about')}
              placeholder="Brief description of the customer"
              rows={2}
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
