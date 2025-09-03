// Main exports for the Search Engine system
export { SearchEngine } from './SearchEngine'
export { 
  SearchEngineFactory,
  createSearchEngine,
  createRevengeDetectionEngine, 
  createCopyrightDetectionEngine,
  createFastSearchEngine
} from './SearchEngineFactory'

// Type definitions
export type {
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchEngineResult,
  SearchEngineConfig
} from './types'

// Configuration exports
export {
  defaultSearchConfig,
  planBasedConfigs,
  searchTypeConfigs,
  securityLevelConfigs,
  getConfigForUser
} from './config'

// Provider implementations
export { GoogleVisionProvider } from './providers/GoogleVisionProvider'
export { TinEyeProvider } from './providers/TinEyeProvider'
export { ProprietaryProvider } from './providers/ProprietaryProvider'

// Utility functions
export const getSearchEngineForUser = (
  userPlan: 'free' | 'basic' | 'pro',
  searchType: 'revenge_detection' | 'copyright_detection' | 'general_search' = 'general_search'
) => {
  return createSearchEngine(userPlan, searchType)
}

export const validateSearchSystem = () => {
  return SearchEngineFactory.validateSystemConfiguration()
}

export const getSystemStats = async () => {
  return SearchEngineFactory.getGlobalProviderStats()
}