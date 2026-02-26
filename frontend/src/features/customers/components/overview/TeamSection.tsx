/**
 * Team Section
 *
 * Team member list with add/edit/remove inline forms.
 */

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TeamMember } from '../../types'

interface TeamSectionProps {
  team: TeamMember[]
  onSave: (team: TeamMember[]) => void
  isSaving?: boolean
}

interface TeamMemberFormState {
  name: string
  role: string
  email: string
  notes: string
}

const emptyMember: TeamMemberFormState = { name: '', role: '', email: '', notes: '' }

function TeamMemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 group">
      <div className="min-w-0 shrink-0">
        <p className="text-sm font-medium text-foreground">{member.name}</p>
        {member.role && <p className="text-xs text-muted-foreground">{member.role}</p>}
        {member.email && <p className="text-xs text-muted-foreground">{member.email}</p>}
      </div>
      {member.notes && (
        <p className="text-xs text-muted-foreground italic truncate max-w-[250px]">{member.notes}</p>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function TeamMemberForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: TeamMemberFormState
  onSave: (member: TeamMemberFormState) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3 rounded-md border border-border/50 bg-muted/30">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <Label htmlFor="tm-name" className="text-xs">Name *</Label>
          <Input
            id="tm-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-0.5 h-8 text-sm"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="tm-role" className="text-xs">Role</Label>
          <Input
            id="tm-role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="mt-0.5 h-8 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="tm-email" className="text-xs">Email</Label>
          <Input
            id="tm-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-0.5 h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="tm-notes" className="text-xs">Notes</Label>
        <Input
          id="tm-notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-0.5 h-8 text-sm"
          placeholder="Optional notes..."
        />
      </div>
      <div className="flex items-center justify-end gap-1 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
        <Button type="submit" size="sm" disabled={!form.name.trim()} className="gap-1">
          <Check className="h-3 w-3" />
          Save
        </Button>
      </div>
    </form>
  )
}

export function TeamSection({ team, onSave, isSaving }: TeamSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const handleAddMember = (member: TeamMemberFormState) => {
    const newTeam = [...team, {
      name: member.name.trim(),
      role: member.role.trim() || undefined,
      email: member.email.trim() || undefined,
      notes: member.notes.trim() || undefined,
    }]
    onSave(newTeam)
    setIsAdding(false)
  }

  const handleEditMember = (index: number, member: TeamMemberFormState) => {
    const newTeam = [...team]
    newTeam[index] = {
      name: member.name.trim(),
      role: member.role.trim() || undefined,
      email: member.email.trim() || undefined,
      notes: member.notes.trim() || undefined,
    }
    onSave(newTeam)
    setEditingIndex(null)
  }

  const handleDeleteMember = (index: number) => {
    const newTeam = team.filter((_, i) => i !== index)
    onSave(newTeam)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Team Members</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={isAdding || isSaving}
          className="gap-1"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      {team.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground italic py-2">No team members added yet.</p>
      )}

      <div className="space-y-1">
        {team.map((member, index) =>
          editingIndex === index ? (
            <TeamMemberForm
              key={index}
              initial={{
                name: member.name,
                role: member.role || '',
                email: member.email || '',
                notes: member.notes || '',
              }}
              onSave={(m) => handleEditMember(index, m)}
              onCancel={() => setEditingIndex(null)}
            />
          ) : (
            <TeamMemberRow
              key={index}
              member={member}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => handleDeleteMember(index)}
            />
          )
        )}
      </div>

      {isAdding && (
        <TeamMemberForm
          initial={emptyMember}
          onSave={handleAddMember}
          onCancel={() => setIsAdding(false)}
        />
      )}
    </div>
  )
}
