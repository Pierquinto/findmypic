export interface SearchResult {
  id: string
  url: string
  siteName: string
  title?: string
  similarity: number
  status: 'violation' | 'partial' | 'clean'
  thumbnail?: string
  detectedAt: Date
  provider: string
  webPageUrl?: string // URL of the web page containing this image
  metadata?: {
    imageSize?: { width: number; height: number }
    fileFormat?: string
    contextText?: string
    domain?: string
    isAdultContent?: boolean
    copyrightRisk?: 'high' | 'medium' | 'low'
    
    // Advanced Google Vision metadata
    detectedObjects?: Array<{
      name: string
      confidence: number
      location?: any
    }>
    categories?: Array<{
      category: string
      confidence: number
    }>
    textContent?: {
      hasText: boolean
      textSnippet?: string
      language?: string
      possibleWatermark?: boolean
    }
    faces?: {
      count: number
      emotions?: Array<{
        joy: string
        anger: string
        surprise: string
      }>
      detectionConfidence?: number
    }
    logos?: Array<{
      brand: string
      confidence: number
    }>
    landmarks?: Array<{
      name: string
      confidence: number
      location?: any
    }>
    contentAnalysis?: {
      adult: string
      medical: string
      spoofed: string
      violence: string
      racy: string
      riskLevel: 'low' | 'medium' | 'high'
    }
  }
}

export interface SearchQuery {
  imageData: string // Base64 encoded image
  imageHash?: string
  searchType?: 'general_search' | 'copyright_detection' | 'revenge_detection'
  userPlan?: 'free' | 'basic' | 'pro'
  options?: {
    maxResults?: number
    similarityThreshold?: number
    includeSafeSearch?: boolean
    includeAdultSites?: boolean
    targetSites?: string[]
    excludeSites?: string[]
    
    // Google Vision API Advanced Options
    includeGeoResults?: boolean // Include geo-localized results
    languageHints?: string[] // Language hints for text detection
    detectFaces?: boolean // Enable face detection
    detectLogos?: boolean // Enable logo detection  
    detectLandmarks?: boolean // Enable landmark detection
    detectText?: boolean // Enable text detection
    detectObjects?: boolean // Enable object localization
    analyzeLabels?: boolean // Enable label detection
    
    // Content filtering options
    filterAdultContent?: boolean // Filter adult content
    filterMedicalContent?: boolean // Filter medical content
    filterViolentContent?: boolean // Filter violent content
    
    // Similarity tuning
    visualSimilarityBoost?: number // Boost visual similarity (0.0-2.0)
    exactMatchPriority?: boolean // Prioritize exact matches
    
    // Processing options
    cropHintsEnabled?: boolean // Enable automatic crop hints
    aspectRatios?: number[] // Preferred aspect ratios for analysis
    
    // Advanced Google Vision Parameters
    geoResults?: string // Geographic region filter ('US', 'EU', etc.)
    confidenceThreshold?: number // Confidence threshold (0.0-1.0)
    matchTypes?: string[] // Match types: 'EXACT', 'PARTIAL', 'PAGE'
    cropConfidence?: number // Crop detection confidence (0.0-1.0)
    
    // Product search options
    searchRegion?: any // Bounding polygon for region of interest
    productSet?: string // Product set for branded content detection
    productCategories?: string[] // Product categories to focus on
    geoFilter?: string // Geographic filter for product search
    
    // Text detection options
    textLanguageHints?: string[] // OCR language hints
    advancedOcr?: string[] // Advanced OCR options
    
    // Face detection options
    faceConfidenceThreshold?: number // Face detection confidence (0.0-1.0)
    includeFaceGeo?: boolean // Include face geographic data
    maxFaces?: number // Maximum faces to detect
    
    // Search quality options
    minImageQuality?: number // Minimum image quality threshold
    duplicateThreshold?: number // Duplicate detection threshold
    temporalFilter?: string // Time-based filtering ('recent', 'all')
    domainWhitelist?: string[] // Only search specific domains
    domainBlacklist?: string[] // Exclude specific domains
  }
}

export interface SearchProvider {
  name: string
  isAvailable(): Promise<boolean>
  search(query: SearchQuery): Promise<SearchResult[]>
  getRateLimit(): { remaining: number; resetTime: Date }
  getMetadata(): {
    description: string
    capabilities: string[]
    coverage: 'global' | 'regional' | 'specialized'
    costPerSearch?: number
  }
}

export interface SearchEngineConfig {
  providers: {
    [key: string]: {
      enabled: boolean
      priority: number
      apiKey?: string
      baseUrl?: string
      rateLimit?: {
        requestsPerMinute: number
        requestsPerDay: number
      }
      fallbackProviders?: string[]
    }
  }
  aggregation: {
    deduplicationThreshold: number
    minimumSimilarity: number
    maxResultsPerProvider: number
    timeoutMs: number
  }
}

export interface SearchEngineResult {
  query: SearchQuery
  results: SearchResult[]
  metadata: {
    totalResults: number
    searchTime: number
    providersUsed: string[]
    providersFailures: Array<{ provider: string; error: string }>
  }
}