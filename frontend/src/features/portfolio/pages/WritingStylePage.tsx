/**
 * Writing Style Page (Phase 4)
 *
 * Allows users to manage their writing examples for AI style matching.
 * - List existing examples with edit/delete
 * - Upload new examples (paste, file)
 * - Minimum 500 words validation
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Edit2,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  useWritingExamples,
  useCreateWritingExample,
  useDeleteWritingExample,
} from '../hooks/useWritingExamples'
import type { UserWritingExample, WritingExampleSourceType } from '../types/portfolio'

// =============================================================================
// Constants
// =============================================================================

const MIN_WORD_COUNT = 500
const TARGET_EXAMPLES = 5

// =============================================================================
// Helper Functions
// =============================================================================

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// =============================================================================
// Writing Example Card Component
// =============================================================================

interface WritingExampleCardProps {
  example: UserWritingExample
  onDelete: (id: string) => void
  isDeleting: boolean
}

function WritingExampleCard({ example, onDelete, isDeleting }: WritingExampleCardProps) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg bg-brand-300/20 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-brand-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{example.name}</h3>
            <p className="text-sm text-muted-foreground">
              {example.word_count.toLocaleString()} words
              {example.source_type && ` • ${example.source_type}`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(example.id)}
          disabled={isDeleting}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-muted-foreground line-clamp-3">
        {example.content.substring(0, 200)}...
      </p>

      {/* Analyzed Characteristics Badge */}
      {example.analyzed_characteristics && (
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          <span>Style analyzed</span>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Upload Form Component
// =============================================================================

interface UploadFormProps {
  onSubmit: (data: { name: string; content: string; sourceType: WritingExampleSourceType }) => void
  onCancel: () => void
  isSubmitting: boolean
}

function UploadForm({ onSubmit, onCancel, isSubmitting }: UploadFormProps) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [sourceType, setSourceType] = useState<'pasted' | 'file_upload'>('pasted')
  const [error, setError] = useState<string | null>(null)

  const wordCount = countWords(content)
  const isValid = name.trim() && wordCount >= MIN_WORD_COUNT

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) {
      setError(`Content must be at least ${MIN_WORD_COUNT} words. Current: ${wordCount}`)
      return
    }
    setError(null)
    onSubmit({ name, content, sourceType })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setContent(text)
      setSourceType('file_upload')
      if (!name) {
        setName(file.name.replace(/\.[^/.]+$/, ''))
      }
    } catch {
      setError('Failed to read file')
    }
  }

  // Source types - these are technical identifiers, not displayed categories
  // The file upload handler will set this automatically
  const sourceTypes = useMemo(() => [
    { value: 'pasted' as const, label: 'Paste Text' },
    { value: 'file_upload' as const, label: 'Upload File' },
  ], [])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Add Writing Example</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Name Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Example Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Best Blog Post"
          required
        />
      </div>

      {/* Source Type Field */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Content Type</label>
        <div className="flex flex-wrap gap-2">
          {sourceTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSourceType(type.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                sourceType === type.value
                  ? 'bg-brand-300 text-white'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Content</label>
          <label className="text-xs text-brand-300 cursor-pointer hover:underline">
            <input
              type="file"
              accept=".txt,.md,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            Upload file
          </label>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your writing sample here (minimum 500 words)..."
          rows={12}
          className="font-mono text-sm"
        />
        <div className="flex items-center justify-between text-xs">
          <span
            className={cn(
              'flex items-center gap-1',
              wordCount >= MIN_WORD_COUNT ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {wordCount >= MIN_WORD_COUNT ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {wordCount.toLocaleString()} / {MIN_WORD_COUNT} words minimum
          </span>
          {error && <span className="text-destructive">{error}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Example
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// =============================================================================
// Main Page Component
// =============================================================================

export function WritingStylePage() {
  const navigate = useNavigate()
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Data hooks
  const { data: examples = [], isLoading } = useWritingExamples()
  const createExample = useCreateWritingExample()
  const deleteExample = useDeleteWritingExample()

  const handleCreate = async (data: { name: string; content: string; sourceType: WritingExampleSourceType }) => {
    try {
      await createExample.mutateAsync({
        name: data.name,
        content: data.content,
        source_type: data.sourceType,
      })
      setShowUploadForm(false)
    } catch (err) {
      console.error('[WritingStylePage] Failed to create example:', err)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteExample.mutateAsync(id)
    } catch (err) {
      console.error('[WritingStylePage] Failed to delete example:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const progressCount = Math.min(examples.length, TARGET_EXAMPLES)

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-display-md font-semibold text-foreground">Writing Style</h1>
          <p className="mt-1 text-muted-foreground">
            Add examples of your writing to help AI match your voice.
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="rounded-xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Progress</h2>
          <span className="text-sm text-muted-foreground">
            {examples.length} / {TARGET_EXAMPLES} examples
          </span>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: TARGET_EXAMPLES }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                i < progressCount ? 'bg-brand-300' : 'bg-muted'
              )}
            />
          ))}
        </div>
        {examples.length < TARGET_EXAMPLES && (
          <p className="mt-3 text-sm text-muted-foreground">
            Add {TARGET_EXAMPLES - examples.length} more example
            {TARGET_EXAMPLES - examples.length > 1 ? 's' : ''} for best results.
          </p>
        )}
        {examples.length >= TARGET_EXAMPLES && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Great! You have enough examples for accurate style matching.
          </p>
        )}
      </div>

      {/* Upload Form or Add Button */}
      {showUploadForm ? (
        <div className="rounded-xl bg-card border border-border p-6">
          <UploadForm
            onSubmit={handleCreate}
            onCancel={() => setShowUploadForm(false)}
            isSubmitting={createExample.isPending}
          />
        </div>
      ) : (
        <Button
          onClick={() => setShowUploadForm(true)}
          className="w-full gap-2"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Add Writing Example
        </Button>
      )}

      {/* Examples List */}
      <div className="space-y-4">
        <h2 className="text-heading-md font-semibold text-foreground">Your Examples</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : examples.length === 0 ? (
          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No examples yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add samples of your writing to teach the AI your unique voice.
            </p>
            <Button onClick={() => setShowUploadForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Example
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {examples.map((example) => (
              <WritingExampleCard
                key={example.id}
                example={example}
                onDelete={handleDelete}
                isDeleting={deletingId === example.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="rounded-xl bg-secondary/50 border border-border p-6 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Edit2 className="h-4 w-4" />
          Tips for Best Results
        </h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-brand-300">•</span>
            Choose samples that represent your best writing
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-300">•</span>
            Include variety: blog posts, emails, social content
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-300">•</span>
            Each sample should be at least 500 words
          </li>
          <li className="flex items-start gap-2">
            <span className="text-brand-300">•</span>
            5 examples gives the AI enough data to learn your style
          </li>
        </ul>
      </div>
    </div>
  )
}

export default WritingStylePage
