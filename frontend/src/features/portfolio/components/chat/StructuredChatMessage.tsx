/**
 * StructuredChatMessage Component
 *
 * Renders an assistant message with structured response format.
 * Shows: Discussion (collapsible) -> Title -> Actionable Cards -> CTA
 */

import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DiscussionSection } from './DiscussionSection'
import { ArtifactSuggestionCard } from './ArtifactSuggestionCard'
import type {
  ParsedChatMessage,
  ArtifactSuggestion,
  ActionableItem,
} from '../../types/chat'

// =============================================================================
// Types
// =============================================================================

export interface StructuredChatMessageProps {
  /** Parsed message with structured response data */
  message: ParsedChatMessage
  /** Message history (all messages before this one) */
  messageHistory: ParsedChatMessage[]
  /** Set of item IDs that have been added */
  addedItemIds: Set<string>
  /** Callback when an artifact is created (draft only) */
  onCreateArtifact: (suggestion: ArtifactSuggestion) => Promise<void>
  /** Callback when content creation is triggered (Phase 1: research + skeleton) */
  onCreateContent?: (suggestion: ArtifactSuggestion) => Promise<void>
  /** Additional class name */
  className?: string
}

// =============================================================================
// Sub Components
// =============================================================================

interface ActionableCardsGridProps {
  items: ActionableItem[]
  artifactSuggestions?: ArtifactSuggestion[]
  addedItemIds: Set<string>
  onCreateArtifact: (suggestion: ArtifactSuggestion) => Promise<void>
  onCreateContent?: (suggestion: ArtifactSuggestion) => Promise<void>
}

function ActionableCardsGrid({
  items,
  artifactSuggestions,
  addedItemIds,
  onCreateArtifact,
  onCreateContent,
}: ActionableCardsGridProps) {
  // Merge actionable items with artifact suggestions
  // Artifact suggestions may come from suggestArtifactIdeas tool separately
  const allArtifacts: ArtifactSuggestion[] = [
    // Convert artifact_suggestion or topic_suggestion actionable items to ArtifactSuggestion format
    ...items
      .filter((item) => item.type === 'topic_suggestion' || item.type === 'artifact_preview')
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: (item.metadata?.type as ArtifactSuggestion['type']) ?? 'blog',
        rationale: (item.metadata?.rationale as string) ?? '',
        tags: (item.metadata?.tags as string[]) ?? [],
      })),
    // Include direct artifact suggestions if available
    ...(artifactSuggestions ?? []),
  ]

  // Deduplicate by ID
  const uniqueArtifacts = Array.from(
    new Map(allArtifacts.map((a) => [a.id, a])).values()
  )

  if (uniqueArtifacts.length === 0) {
    return null
  }

  return (
    <div className="grid gap-3 grid-cols-1">
      {uniqueArtifacts.map((suggestion) => (
        <ArtifactSuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          isAdded={addedItemIds.has(suggestion.id)}
          onCreate={onCreateArtifact}
          onCreateContent={onCreateContent}
        />
      ))}
    </div>
  )
}

interface CTASectionProps {
  text: string
}

function CTASection({ text }: CTASectionProps) {
  return (
    <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function StructuredChatMessage({
  message,
  messageHistory,
  addedItemIds,
  onCreateArtifact,
  onCreateContent,
  className,
}: StructuredChatMessageProps) {
  const { structuredResponse, artifactSuggestions, content } = message

  // If no structured response, render as plain text
  if (!structuredResponse) {
    // Check if we have artifact suggestions from the suggestArtifactIdeas tool
    if (artifactSuggestions && artifactSuggestions.length > 0) {
      return (
        <div className={cn('flex gap-3 p-4', className)}>
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bot className="h-4 w-4" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4 max-w-[90%]">
            {/* Plain text content if any */}
            {content && (
              <div className="rounded-lg bg-muted px-4 py-2 text-sm">
                <div className="whitespace-pre-wrap break-words">{content}</div>
              </div>
            )}

            {/* Artifact suggestions cards */}
            <ActionableCardsGrid
              items={[]}
              artifactSuggestions={artifactSuggestions}
              addedItemIds={addedItemIds}
              onCreateArtifact={onCreateArtifact}
              onCreateContent={onCreateContent}
            />
          </div>
        </div>
      )
    }

    // Plain text message
    return (
      <div className={cn('flex gap-3 p-4', className)}>
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Bot className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex max-w-[80%] flex-col gap-2 items-start">
          <div className="rounded-lg bg-muted px-4 py-2 text-sm">
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
        </div>
      </div>
    )
  }

  // Render structured response
  const { interpretation, title, actionableItems, ctaText } = structuredResponse

  // Check if we have actionable items to show
  const hasActionableItems = actionableItems.length > 0 || (artifactSuggestions && artifactSuggestions.length > 0)

  return (
    <div className={cn('flex gap-3 p-4', className)}>
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 max-w-[90%]">
        {/* 1. Discussion Section (Collapsible) - Only show when artifacts are provided */}
        {hasActionableItems && (
          <DiscussionSection
            messageHistory={messageHistory}
            interpretation={interpretation}
            defaultCollapsed={true}
          />
        )}

        {/* 2. Title */}
        <h3 className="text-lg font-semibold">{title}</h3>

        {/* 3. Clarifying Questions (for CLARIFY requests) */}
        {interpretation.requestDecision === 'CLARIFY' &&
          interpretation.clarifyingQuestions &&
          interpretation.clarifyingQuestions.length > 0 && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                To help you better, I need to know:
              </div>
              <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {interpretation.clarifyingQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

        {/* 4. Supported/Unsupported Parts (for PARTIAL/UNSUPPORTED requests) */}
        {interpretation.requestDecision === 'PARTIAL' && (
          <div className="space-y-3">
            {interpretation.supportedParts && interpretation.supportedParts.length > 0 && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
                <div className="text-sm font-medium text-green-900 dark:text-green-100">
                  I can help with:
                </div>
                <ul className="list-disc list-inside text-sm text-green-800 dark:text-green-200 space-y-1">
                  {interpretation.supportedParts.map((part, i) => (
                    <li key={i}>{part}</li>
                  ))}
                </ul>
              </div>
            )}
            {interpretation.unsupportedParts && interpretation.unsupportedParts.length > 0 && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 space-y-2">
                <div className="text-sm font-medium text-red-900 dark:text-red-100">
                  I can't help with:
                </div>
                <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                  {interpretation.unsupportedParts.map((part, i) => (
                    <li key={i}>{part}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {interpretation.requestDecision === 'UNSUPPORTED' &&
          interpretation.unsupportedParts &&
          interpretation.unsupportedParts.length > 0 && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 space-y-2">
              <div className="text-sm font-medium text-red-900 dark:text-red-100">
                I can't help with:
              </div>
              <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200 space-y-1">
                {interpretation.unsupportedParts.map((part, i) => (
                  <li key={i}>{part}</li>
                ))}
              </ul>
            </div>
          )}

        {/* 5. Actionable Cards (if any) */}
        {actionableItems.length > 0 || (artifactSuggestions && artifactSuggestions.length > 0) ? (
          <ActionableCardsGrid
            items={actionableItems}
            artifactSuggestions={artifactSuggestions}
            addedItemIds={addedItemIds}
            onCreateArtifact={onCreateArtifact}
            onCreateContent={onCreateContent}
          />
        ) : null}

        {/* 6. CTA Section */}
        <CTASection text={ctaText} />
      </div>
    </div>
  )
}

export default StructuredChatMessage
