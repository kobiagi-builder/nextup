/**
 * Skills Matrix Page
 *
 * Track competencies for content angle suggestions.
 * Features: category tabs, skill cards with proficiency, add/edit/delete.
 */

import { useState, useMemo } from 'react'
import { Plus, Package, Code, Users, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSkills, useCreateSkill, useUpdateSkill, useDeleteSkill } from '../hooks/useSkills'
import { SkillForm } from '../components/forms'
import { SkillCard, EmptySkills } from '../components'
import type { Skill, SkillCategory, CreateSkillInput } from '../types/portfolio'
import { cn } from '@/lib/utils'

/** Category filter options */
const CATEGORIES: { value: SkillCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Package },
  { value: 'product', label: 'Product', icon: Package },
  { value: 'technical', label: 'Technical', icon: Code },
  { value: 'leadership', label: 'Leadership', icon: Users },
  { value: 'industry', label: 'Industry', icon: Building },
]

export function SkillsPage() {
  // State
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)

  // Data hooks
  const { data: skills = [], isLoading } = useSkills()
  const createSkill = useCreateSkill()
  const updateSkill = useUpdateSkill()
  const deleteSkill = useDeleteSkill()

  // Filter skills by category
  const filteredSkills = useMemo(() => {
    if (categoryFilter === 'all') return skills
    return skills.filter((skill) => skill.category === categoryFilter)
  }, [skills, categoryFilter])

  // Group skills by category for display
  const skillsByCategory = useMemo(() => {
    const grouped: Record<SkillCategory, Skill[]> = {
      product: [],
      technical: [],
      leadership: [],
      industry: [],
    }
    filteredSkills.forEach((skill) => {
      grouped[skill.category].push(skill)
    })
    // Sort by proficiency within each category
    Object.keys(grouped).forEach((key) => {
      grouped[key as SkillCategory].sort((a, b) => b.proficiency - a.proficiency)
    })
    return grouped
  }, [filteredSkills])

  // Get counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<SkillCategory | 'all', number> = {
      all: skills.length,
      product: 0,
      technical: 0,
      leadership: 0,
      industry: 0,
    }
    skills.forEach((skill) => {
      counts[skill.category]++
    })
    return counts
  }, [skills])

  // Handle create skill
  const handleCreate = async (data: CreateSkillInput) => {
    try {
      await createSkill.mutateAsync(data)
      setIsCreateOpen(false)
    } catch (error) {
      console.error('Failed to create skill:', error)
    }
  }

  // Handle edit skill
  const handleEdit = async (data: CreateSkillInput) => {
    if (!editingSkill) return
    try {
      await updateSkill.mutateAsync({
        id: editingSkill.id,
        updates: data,
      })
      setEditingSkill(null)
    } catch (error) {
      console.error('Failed to update skill:', error)
    }
  }

  // Handle delete skill
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this skill?')) {
      try {
        await deleteSkill.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete skill:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-display-md font-semibold text-foreground">
          Skills Matrix
        </h1>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Skill
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex rounded-lg bg-secondary p-1 overflow-x-auto">
        {CATEGORIES.map((category) => {
          const Icon = category.icon
          return (
            <button
              key={category.value}
              onClick={() => setCategoryFilter(category.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                categoryFilter === category.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {category.value !== 'all' && <Icon className="h-4 w-4" />}
              {category.label}
              <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                {categoryCounts[category.value]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-card border border-border animate-pulse"
            />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <EmptySkills onCreate={() => setIsCreateOpen(true)} />
      ) : filteredSkills.length === 0 ? (
        <div className="rounded-xl bg-card p-12 border border-border text-center">
          <h3 className="text-heading-md font-semibold text-foreground mb-2">
            No skills in this category
          </h3>
          <p className="text-muted-foreground">
            Add a skill to the {CATEGORIES.find((c) => c.value === categoryFilter)?.label} category.
          </p>
        </div>
      ) : categoryFilter === 'all' ? (
        // Show grouped by category when "All" is selected
        <div className="space-y-8">
          {CATEGORIES.filter((c) => c.value !== 'all').map((category) => {
            const categorySkills = skillsByCategory[category.value as SkillCategory]
            if (categorySkills.length === 0) return null
            const Icon = category.icon
            return (
              <div key={category.value}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-heading-md font-semibold text-foreground">
                    {category.label}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    ({categorySkills.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorySkills.map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      onEdit={() => setEditingSkill(skill)}
                      onDelete={() => handleDelete(skill.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        // Show flat grid when category is filtered
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={() => setEditingSkill(skill)}
              onDelete={() => handleDelete(skill.id)}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg" data-portal-ignore-click-outside>
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
          </DialogHeader>
          <SkillForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createSkill.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSkill} onOpenChange={(open) => !open && setEditingSkill(null)}>
        <DialogContent className="max-w-lg" data-portal-ignore-click-outside>
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
          </DialogHeader>
          {editingSkill && (
            <SkillForm
              skill={editingSkill}
              onSubmit={handleEdit}
              onCancel={() => setEditingSkill(null)}
              isLoading={updateSkill.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SkillsPage
