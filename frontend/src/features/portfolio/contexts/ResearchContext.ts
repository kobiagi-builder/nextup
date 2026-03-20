import { createContext, useContext } from 'react'
import type { ArtifactResearch } from '../types/portfolio'

export const ResearchContext = createContext<ArtifactResearch[]>([])

export function useResearchContext() {
  return useContext(ResearchContext)
}
