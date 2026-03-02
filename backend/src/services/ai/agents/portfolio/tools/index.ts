/**
 * AI Tools Index
 *
 * Exports all tool definitions for Vercel AI SDK v6.
 */

// Content tools
export {
  createArtifactDraft,
  updateArtifactContent,
  getArtifactContent,
  listRecentArtifacts,
} from './contentTools.js'

// Profile tools
export {
  getUserContext,
  getUserSkills,
  suggestProfileUpdates,
} from './profileTools.js'

// Context tools (ad-hoc fetchers for Content Agent)
export {
  fetchArtifactTopics,
  fetchArtifact,
  fetchResearch,
  listDraftArtifacts,
} from './contextTools.js'

// Topics research tool
export {
  topicsResearch,
} from './topicsResearchTool.js'

// Visuals creator tool
export {
  generateContentVisuals,
} from './visualsCreatorTool.js'

// Image generation tools (Phase 3)
export {
  identifyImageNeeds,
  updateImageApproval,
} from './imageNeedsTools.js'

export {
  generateFinalImages,
  regenerateImage,
} from './finalImageTools.js'

// Writing characteristics tools (Phase 4)
export {
  analyzeWritingCharacteristics,
} from './writingCharacteristicsTools.js'

// Content improvement tools (in-editor AI feedback)
export {
  improveTextContent,
  improveImageContent,
} from './contentImprovementTools.js'

// Social post tools (promote articles as social posts)
export {
  writeSocialPostContent,
} from './socialPostTools.js'

// Interview tools (showcase-specific)
export {
  startShowcaseInterview,
  saveInterviewAnswer,
  completeShowcaseInterview,
} from './interviewTools.js'
