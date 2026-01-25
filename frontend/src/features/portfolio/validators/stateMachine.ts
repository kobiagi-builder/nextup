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
 * Check if artifact can be edited (not archived)
 */
export function canEditArtifact(status: ArtifactStatus): boolean {
  return status !== 'archived'
}

/**
 * Check if artifact can be archived
 */
export function canArchiveArtifact(status: ArtifactStatus): boolean {
  return status !== 'archived'
}

/**
 * Check if artifact can be restored from archive
 */
export function canRestoreArtifact(status: ArtifactStatus): boolean {
  return status === 'archived'
}


// =============================================================================
// Status Display Helpers
// =============================================================================

/** Status colors for UI (Tailwind classes) */
export const STATUS_COLORS: Record<ArtifactStatus, string> = {
  draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  researching: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skeleton_ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  skeleton_approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  in_progress: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ready: 'bg-green-500/10 text-green-400 border-green-500/20',
  published: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

/** Status icons (Lucide icon names) */
export const STATUS_ICONS: Record<ArtifactStatus, string> = {
  draft: 'FileEdit',
  researching: 'Search',
  skeleton_ready: 'FileCheck',
  skeleton_approved: 'ThumbsUp',
  in_progress: 'Clock',
  ready: 'CheckCircle',
  published: 'Send',
  archived: 'Archive',
}

/** Human-readable status labels */
export const STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: 'Draft',
  researching: 'Researching...',
  skeleton_ready: 'Skeleton Ready',
  skeleton_approved: 'Skeleton Approved',
  in_progress: 'In Progress',
  ready: 'Ready',
  published: 'Published',
  archived: 'Archived',
}
