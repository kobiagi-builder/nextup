/**
 * Portfolio Validators Index
 *
 * Re-exports all validation utilities.
 */

export {
  // Artifact validators
  validateArtifactTransition,
  getArtifactTransitions,
  canPublishArtifact,
  canEditArtifact,
  canArchiveArtifact,
  canRestoreArtifact,
  // Display helpers
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
  // Types
  type ValidationResult,
} from './stateMachine'
