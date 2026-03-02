/**
 * ICP Settings Section
 *
 * Embedded in SettingsPage. Allows users to configure their Ideal Customer
 * Profile criteria for automated scoring during LinkedIn import.
 */

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { TagsInput } from '@/features/portfolio/components/artifact/TagsInput'
import { useIcpSettings, useUpsertIcpSettings } from '../../hooks/useIcpSettings'
import type { IcpSettingsInput } from '../../types'

export function IcpSettingsSection() {
  const { data: settings, isLoading } = useIcpSettings()
  const upsertMutation = useUpsertIcpSettings()

  const [employeeMin, setEmployeeMin] = useState<string>('')
  const [employeeMax, setEmployeeMax] = useState<string>('')
  const [industries, setIndustries] = useState<string[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [description, setDescription] = useState('')

  // Sync form state when settings load
  useEffect(() => {
    if (settings) {
      setEmployeeMin(settings.target_employee_min?.toString() ?? '')
      setEmployeeMax(settings.target_employee_max?.toString() ?? '')
      setIndustries(settings.target_industries ?? [])
      setSpecialties(settings.target_specialties ?? [])
      setDescription(settings.description ?? '')
    }
  }, [settings])

  const handleSave = async () => {
    const input: IcpSettingsInput = {
      target_employee_min: employeeMin ? parseInt(employeeMin, 10) : null,
      target_employee_max: employeeMax ? parseInt(employeeMax, 10) : null,
      target_industries: industries,
      target_specialties: specialties,
      description,
    }

    try {
      await upsertMutation.mutateAsync(input)
      toast({ title: 'ICP settings saved' })
    } catch {
      toast({ title: 'Failed to save ICP settings', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-5">
      {/* Employee Range */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Target Employee Count
        </label>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            placeholder="Min"
            value={employeeMin}
            onChange={(e) => setEmployeeMin(e.target.value)}
            min={0}
            className="w-28"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="number"
            placeholder="Max"
            value={employeeMax}
            onChange={(e) => setEmployeeMax(e.target.value)}
            min={0}
            className="w-28"
          />
          <span className="text-muted-foreground text-xs">employees</span>
        </div>
      </div>

      {/* Industries */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Target Industries
        </label>
        <TagsInput
          tags={industries}
          onChange={setIndustries}
          placeholder="Add industries (e.g., SaaS, Fintech)..."
        />
      </div>

      {/* Specialties */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Target Specialties
        </label>
        <TagsInput
          tags={specialties}
          onChange={setSpecialties}
          placeholder="Add specialties (e.g., AI, Enterprise, B2B)..."
        />
      </div>

      {/* Free-text Description */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          ICP Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your ideal customer in free text. This is used for qualitative AI scoring..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={upsertMutation.isPending}
          size="sm"
        >
          {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save ICP Settings
        </Button>
      </div>
    </div>
  )
}
