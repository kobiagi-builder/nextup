/**
 * Customer Info Section
 *
 * Display/edit toggle for customer information fields.
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Check, Plus, X, Linkedin, Globe, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Spinner } from '@/components/ui/spinner'
import type { CustomerInfo, IcpScore } from '../../types'
import { IcpScorePill } from '../shared/IcpScorePill'

export function isValidLinkedInCompanyUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?linkedin\.com\/company\/[^\/\?#]+/.test(url)
}

export function isValidWebsiteUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

const customerInfoSchema = z.object({
  about: z.string().optional(),
  vertical: z.string().optional(),
  persona: z.string().optional(),
  icp: z.string().optional(),
  linkedin_company_url: z.string().optional(),
  website_url: z.string().optional(),
  product_name: z.string().optional(),
  product_stage: z.string().optional(),
  product_category: z.string().optional(),
  product_description: z.string().optional(),
  product_url: z.string().optional(),
})

type CustomerInfoFormData = z.infer<typeof customerInfoSchema>

interface CustomerInfoSectionProps {
  info: CustomerInfo
  onSave: (info: CustomerInfo) => void
  isSaving?: boolean
  isEnriching?: boolean
}

function InfoField({ label, value, primary, loading }: { label: string; value?: string; primary?: boolean; loading?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {loading && <Spinner size="sm" className="text-muted-foreground" />}
      </div>
      <p className="mt-1 text-sm text-foreground">
        {value || <span className="text-muted-foreground">{primary ? 'Click Edit to add' : '\u2014'}</span>}
      </p>
    </div>
  )
}

export function CustomerInfoSection({ info, onSave, isSaving, isEnriching }: CustomerInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showProductFields, setShowProductFields] = useState(false)

  const formDefaults = {
    about: info.about || '',
    vertical: info.vertical || '',
    persona: info.persona || '',
    icp: info.icp || '',
    linkedin_company_url: info.linkedin_company_url || '',
    website_url: info.website_url || '',
    product_name: info.product?.name || '',
    product_stage: info.product?.stage || '',
    product_category: info.product?.category || '',
    product_description: info.product?.description || '',
    product_url: info.product?.url || '',
  }

  const form = useForm<CustomerInfoFormData>({
    resolver: zodResolver(customerInfoSchema),
    defaultValues: formDefaults,
  })

  // Reset form when info prop changes (e.g. refetch after external update)
  useEffect(() => {
    form.reset(formDefaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info])

  const handleSave = (data: CustomerInfoFormData) => {
    const updatedInfo: CustomerInfo = {
      ...info,
      about: data.about || undefined,
      vertical: data.vertical || undefined,
      persona: data.persona || undefined,
      icp: data.icp || undefined,
      linkedin_company_url: data.linkedin_company_url || undefined,
      website_url: data.website_url || undefined,
      product: {
        name: data.product_name || undefined,
        stage: data.product_stage || undefined,
        category: data.product_category || undefined,
        description: data.product_description || undefined,
        url: data.product_url || undefined,
      },
    }
    onSave(updatedInfo)
    setIsEditing(false)
  }

  const handleIcpScoreChange = (score: IcpScore) => {
    onSave({ ...info, icp_score: score })
  }

  const handleCancel = () => {
    form.reset()
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1">
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        </div>

        {/* URL links */}
        {(info.linkedin_company_url || info.website_url) && (
          <div className="flex flex-wrap items-center gap-3">
            {info.linkedin_company_url && (
              <div className="inline-flex items-center gap-1">
                <a
                  href={info.linkedin_company_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-3.5 w-3.5" />
                  <span className="underline underline-offset-2">LinkedIn</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                {(!isValidLinkedInCompanyUrl(info.linkedin_company_url) || info.enrichment_errors?.linkedin) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help" aria-label="LinkedIn URL issue" />
                      </TooltipTrigger>
                      <TooltipContent data-portal-ignore-click-outside>
                        {!isValidLinkedInCompanyUrl(info.linkedin_company_url)
                          ? 'Invalid LinkedIn company URL format'
                          : info.enrichment_errors?.linkedin}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            {info.website_url && (
              <div className="inline-flex items-center gap-1">
                <a
                  href={info.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="underline underline-offset-2">{isValidWebsiteUrl(info.website_url) ? new URL(info.website_url).hostname.replace('www.', '') : info.website_url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                {(!isValidWebsiteUrl(info.website_url) || info.enrichment_errors?.website) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3.5 w-3.5 text-destructive cursor-help" aria-label="Website URL issue" />
                      </TooltipTrigger>
                      <TooltipContent data-portal-ignore-click-outside>
                        {!isValidWebsiteUrl(info.website_url)
                          ? 'Invalid website URL format'
                          : info.enrichment_errors?.website}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        )}

        {isEnriching && (
          <p className="text-xs text-muted-foreground animate-pulse">Enriching company data...</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Relevance Score</p>
            <div className="mt-1">
              <IcpScorePill score={(info.icp_score as IcpScore) ?? null} onScoreChange={handleIcpScoreChange} />
            </div>
          </div>
          <div className="md:col-span-2">
            <InfoField label="About" value={info.about} primary loading={isEnriching} />
          </div>
          <InfoField label="Vertical" value={info.vertical} loading={isEnriching} />
          <div className="md:col-span-2">
            <InfoField label="Customer's ICP Description" value={info.icp} loading={isEnriching} />
          </div>
          <div className="md:col-span-2">
            <InfoField label="Persona" value={info.persona} loading={isEnriching} />
          </div>
        </div>

        {/* Product section */}
        {(info.product?.name || info.product?.stage || info.product?.category) && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Product</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Name" value={info.product?.name} />
              <InfoField label="Stage" value={info.product?.stage} />
              <InfoField label="Category" value={info.product?.category} />
              <InfoField label="URL" value={info.product?.url} />
              <div className="md:col-span-2">
                <InfoField label="Description" value={info.product?.description} />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-3 w-3" />
          </Button>
          <Button type="submit" size="sm" disabled={isSaving} className="gap-1">
            <Check className="h-3 w-3" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Customer Relevance Score</Label>
          <div className="mt-1">
            <IcpScorePill score={(info.icp_score as IcpScore) ?? null} onScoreChange={handleIcpScoreChange} />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="about">About</Label>
          <Textarea id="about" {...form.register('about')} rows={3} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="vertical">Vertical</Label>
          <Input id="vertical" {...form.register('vertical')} className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="icp">Customer's ICP Description</Label>
          <Textarea id="icp" {...form.register('icp')} rows={2} className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="persona">Persona</Label>
          <Textarea id="persona" {...form.register('persona')} rows={3} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="linkedin_company_url" className="flex items-center gap-1.5">
            <Linkedin className="h-3.5 w-3.5" />
            LinkedIn URL
          </Label>
          <Input id="linkedin_company_url" {...form.register('linkedin_company_url')} placeholder="https://linkedin.com/company/..." className="mt-1" />
        </div>
        <div>
          <Label htmlFor="website_url" className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Website URL
          </Label>
          <Input id="website_url" {...form.register('website_url')} placeholder="https://company.com" className="mt-1" />
        </div>
      </div>

      {/* Product fields — progressive disclosure */}
      <div className="pt-3 border-t border-border/50">
        {showProductFields || info.product?.name || info.product?.stage || info.product?.category ? (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Product</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_name">Name</Label>
                <Input id="product_name" {...form.register('product_name')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="product_stage">Stage</Label>
                <Input id="product_stage" {...form.register('product_stage')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="product_category">Category</Label>
                <Input id="product_category" {...form.register('product_category')} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="product_url">URL</Label>
                <Input id="product_url" {...form.register('product_url')} className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="product_description">Description</Label>
                <Textarea id="product_description" {...form.register('product_description')} rows={2} className="mt-1" />
              </div>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowProductFields(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add product details
          </Button>
        )}
      </div>
    </form>
  )
}
