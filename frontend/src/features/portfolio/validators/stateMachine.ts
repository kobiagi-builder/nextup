/**
 * State Machine Validators
 *
 * Enhanced validation utilities for status transitions.
 * Provides type-safe validation with error messages.
 */

import type { ArtifactStatus } from '../types/portfolio'
import {
  ARTIFACT_TRANSITIONS,
  canTransition,
  getAllowedTransitions,
} from '../types/portfolio'

// =============================================================================
// Validation Result Types
// =============================================================================

/** Result of a transition validation */
export interface ValidationResult {
  valid: boolean
  error?: string
  allowedTransitions?: string[]
}

// =============================================================================
// Artifact Status Validators
// =============================================================================

/**
 * Validate an artifact status transition
 */
export function validateArtifactTransition(
  from: ArtifactStatus,
  to: ArtifactStatus
): ValidationResult {
  if (from === to) {
    return { valid: true } // No-op transition is always valid
  }

  const isValid = canTransition(ARTIFACT_TRANSITIONS, from, to)

  if (isValid) {
    return { valid: true }
  }

  const allowed = getAllowedTransitions(ARTIFACT_TRANSITIONS, from)
  return {
    valid: false,
    error: `Cannot transition artifact from "${from}" to "${to}"`,
    allowedTransitions: allowed,
  }
}

/**
 * Get allowed artifact transitions from current status
 */
export function getArtifactTransitions(from: ArtifactStatus): ArtifactStatus[] {
  return getAllowedTransitions(ARTIFACT_TRANSITIONS, from)
}

/**
 * Check if artifact can be published (must be in "ready" status)
 */
export function canPublishArtifact(status: ArtifactStatus): boolean {
  return status === 'ready'
}

/**
 * Check if artifact can be edited (not in processing state)
 */
export function canEditArtifact(status: ArtifactStatus): boolean {
  return !isProcessingState(status)
}


// =============================================================================
// Status Display Helpers
// =============================================================================

/** Status colors for UI (Tailwind classes) - 11 statuses */
export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  interviewing: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skeleton: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  foundations_approval: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  humanity_checking: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  creating_visuals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

/** Status icons (Lucide icon names) - 11 statuses */
export const STATUS_ICONS: Record<ArtifactStatus, string> = {
  draft: 'FileEdit',
  interviewing: 'MessageCircleQuestion',
  research: 'Search',
  foundations: 'Lightbulb',
  skeleton: 'Layout',
  foundations_approval: 'ClipboardCheck',
  writing: 'PenLine',
  humanity_checking: 'Sparkles',
  creating_visuals: 'Image',
  ready: 'CheckCircle',
  published: 'Send',
}

/** Human-readable status labels - 11 statuses */
export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  interviewing: 'Interviewing',
  research: 'Creating Foundations',
  foundations: 'Creating Foundations',
  skeleton: 'Creating Foundations',
  foundations_approval: 'Foundations Approval',
  writing: 'Creating Content',
  humanity_checking: 'Creating Content',
  creating_visuals: 'Creating Content',
  ready: 'Content Ready',
  published: 'Published',
}

// =============================================================================
// Processing State Detection
// =============================================================================

/** Processing states that lock the editor (chat remains interactive) */
export const PROCESSING_STATES: ArtifactStatus[] = [
  'interviewing', 'research', 'foundations', 'skeleton', 'writing', 'humanity_checking', 'creating_visuals'
]

/**
 * Check if a status is a processing state (editor should be locked)
 */
export function isProcessingState(status: ArtifactStatus): boolean {
  return PROCESSING_STATES.includes(status)
}
