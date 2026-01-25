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
