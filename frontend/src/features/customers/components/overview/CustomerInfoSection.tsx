/**
 * Customer Info Section
 *
 * Display/edit toggle for customer information fields.
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { CustomerInfo } from '../../types'

const customerInfoSchema = z.object({
  about: z.string().optional(),
  vertical: z.string().optional(),
  persona: z.string().optional(),
  icp: z.string().optional(),
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
}

function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm text-foreground">
        {value || <span className="text-muted-foreground italic">Not set</span>}
      </p>
    </div>
  )
}

export function CustomerInfoSection({ info, onSave, isSaving }: CustomerInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false)

  const formDefaults = {
    about: info.about || '',
    vertical: info.vertical || '',
    persona: info.persona || '',
    icp: info.icp || '',
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <InfoField label="About" value={info.about} />
          </div>
          <InfoField label="Vertical" value={info.vertical} />
          <InfoField label="Persona" value={info.persona} />
          <div className="md:col-span-2">
            <InfoField label="ICP (Ideal Customer Profile)" value={info.icp} />
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
        <div className="md:col-span-2">
          <Label htmlFor="about">About</Label>
          <Textarea id="about" {...form.register('about')} rows={3} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="vertical">Vertical</Label>
          <Input id="vertical" {...form.register('vertical')} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="persona">Persona</Label>
          <Input id="persona" {...form.register('persona')} className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="icp">ICP (Ideal Customer Profile)</Label>
          <Textarea id="icp" {...form.register('icp')} rows={2} className="mt-1" />
        </div>
      </div>

      {/* Product fields */}
      <div className="pt-3 border-t border-border/50">
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
      </div>
    </form>
  )
}
