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

// Topic tools
export {
  createTopic,
  updateTopic,
  getTopic,
  listTopics,
  executeTopicToArtifact,
} from './topicTools.js'

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
