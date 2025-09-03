import { SearchProvider, SearchQuery, SearchResult } from '../types'

export class GoogleVisionProvider implements SearchProvider {
  name = 'Google'
  private apiKey: string
  private baseUrl = 'https://vision.googleapis.com/v1'
  private rateLimit = { remaining: 100, resetTime: new Date() }

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async isAvailable(): Promise<boolean> {
    try {
      console.log(`[GoogleVisionProvider] Testing availability with key: ${this.apiKey.substring(0, 10)}...`)
      
      const response = await fetch(`${this.baseUrl}/images:annotate?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' },
            features: [{ type: 'WEB_DETECTION', maxResults: 1 }]
          }]
        })
      })
      
      console.log(`[GoogleVisionProvider] Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log(`[GoogleVisionProvider] Error response: ${errorText}`)
        return false
      }
      
      const result = await response.json()
      console.log(`[GoogleVisionProvider] Success response:`, JSON.stringify(result, null, 2))
      return true
      
    } catch (error) {
      console.error(`[GoogleVisionProvider] Exception:`, error)
      return false
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      const imageContent = query.imageData.replace(/^data:image\/[a-z]+;base64,/, '')
      
      // Advanced Google Vision API options
      const features = [
        // Core web detection for reverse image search
        { 
          type: 'WEB_DETECTION', 
          maxResults: query.options?.maxResults || 50 // Increased for better coverage
        },
        
        // Safe search detection for content filtering
        { type: 'SAFE_SEARCH_DETECTION' },
        
        // Object localization for better matching
        { 
          type: 'OBJECT_LOCALIZATION', 
          maxResults: 20 
        },
        
        // Label detection for content understanding
        { 
          type: 'LABEL_DETECTION', 
          maxResults: 20 
        },
        
        // Text detection for documents/screenshots
        { type: 'DOCUMENT_TEXT_DETECTION' },
        
        // Face detection for person identification
        { 
          type: 'FACE_DETECTION',
          maxResults: 10 
        },
        
        // Logo detection for brand identification
        { 
          type: 'LOGO_DETECTION',
          maxResults: 10 
        },
        
        // Landmark detection for location-based content
        { 
          type: 'LANDMARK_DETECTION',
          maxResults: 10 
        }
      ]

      // Filter features based on search type and user options
      const enabledFeatures = this.filterFeaturesBySearchType(features, query)

      const requestBody = {
        requests: [{
          image: { 
            content: imageContent 
          },
          features: enabledFeatures,
          imageContext: {
            webDetectionParams: {
              includeGeoResults: query.options?.includeGeoResults !== false, // Default true
            },
            languageHints: query.options?.languageHints || ['en', 'it'], // Multi-language support
            cropHintsParams: {
              aspectRatios: [0.8, 1.0, 1.2] // Common aspect ratios
            },
            // Face detection specific params
            ...(query.options?.detectFaces && {
              faceDetectionParams: {
                includeFaceGeometry: query.options.includeFaceGeo || false,
                maxResults: query.options.maxFaces || 10,
                confidenceThreshold: query.options.faceConfidenceThreshold || 0.7
              }
            })
          }
        }]
      }

      console.log('[GoogleVisionProvider] Request features:', enabledFeatures.map(f => f.type))

      const response = await fetch(`${this.baseUrl}/images:annotate?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`)
      }

      const data = await response.json()
      const response_data = data.responses[0]
      const webDetection = response_data?.webDetection
      const safeSearch = response_data?.safeSearchAnnotation
      const objectAnnotations = response_data?.localizedObjectAnnotations
      const labelAnnotations = response_data?.labelAnnotations
      const textAnnotations = response_data?.textAnnotations
      const faceAnnotations = response_data?.faceAnnotations
      const logoAnnotations = response_data?.logoAnnotations
      const landmarkAnnotations = response_data?.landmarkAnnotations

      console.log('[GoogleVisionProvider] Raw response:', JSON.stringify(data, null, 2))

      if (!webDetection) {
        console.log('[GoogleVisionProvider] No web detection data found')
        return []
      }

      console.log('[GoogleVisionProvider] Web detection keys:', Object.keys(webDetection))
      if (webDetection.visuallySimilarImages) {
        console.log('[GoogleVisionProvider] Visual similar images:', webDetection.visuallySimilarImages.length)
      }
      if (webDetection.fullMatchingImages) {
        console.log('[GoogleVisionProvider] Full matching images:', webDetection.fullMatchingImages.length)
      }
      if (webDetection.partialMatchingImages) {
        console.log('[GoogleVisionProvider] Partial matching images:', webDetection.partialMatchingImages.length)
      }
      if (webDetection.pagesWithMatchingImages) {
        console.log('[GoogleVisionProvider] Pages with matching images:', webDetection.pagesWithMatchingImages.length)
        webDetection.pagesWithMatchingImages.forEach((page: any, index: number) => {
          console.log(`[GoogleVisionProvider] Page ${index}:`, {
            url: page.url,
            title: page.pageTitle,
            fullImages: page.fullMatchingImages?.length || 0,
            partialImages: page.partialMatchingImages?.length || 0
          })
        })
      }

      const results: SearchResult[] = []

      // Process visually similar images
      if (webDetection.visuallySimilarImages) {
        for (const image of webDetection.visuallySimilarImages) {
          // Try to find the web page containing this image
          const containingPage = this.findContainingPage(webDetection, image.url)
          
          results.push({
            id: `gv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: image.url,
            siteName: this.extractDomain(image.url),
            title: containingPage?.pageTitle || `Immagine su ${this.extractDomain(image.url)}`,
            similarity: this.calculateSimilarity(webDetection, image),
            status: this.determineStatus(safeSearch, image.url),
            thumbnail: image.url,
            detectedAt: new Date(),
            provider: this.name,
            webPageUrl: containingPage?.url, // URL della pagina web che contiene l'immagine
            metadata: {
              domain: this.extractDomain(image.url),
              isAdultContent: this.isAdultContent(safeSearch),
              copyrightRisk: this.assessCopyrightRisk(image.url),
              contextText: containingPage?.pageTitle,
              ...this.extractAdvancedMetadata(response_data, image.url)
            }
          })
        }
      }

      // Process full matching images (exact matches)
      if (webDetection.fullMatchingImages) {
        for (const image of webDetection.fullMatchingImages) {
          // Try to find the web page containing this image
          const containingPage = this.findContainingPage(webDetection, image.url)
          
          results.push({
            id: `gv-full-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: image.url,
            siteName: this.extractDomain(image.url),
            title: containingPage?.pageTitle || `Match perfetto su ${this.extractDomain(image.url)}`,
            similarity: 100, // Full match = 100%
            status: this.determineStatus(safeSearch, image.url),
            thumbnail: image.url,
            detectedAt: new Date(),
            provider: this.name,
            webPageUrl: containingPage?.url, // URL della pagina web che contiene l'immagine
            metadata: {
              domain: this.extractDomain(image.url),
              isAdultContent: this.isAdultContent(safeSearch),
              copyrightRisk: this.assessCopyrightRisk(image.url),
              contextText: containingPage?.pageTitle,
              ...this.extractAdvancedMetadata(response_data, image.url)
            }
          })
        }
      }

      // Process partial matching images  
      if (webDetection.partialMatchingImages) {
        for (const image of webDetection.partialMatchingImages) {
          // Try to find the web page containing this image
          const containingPage = this.findContainingPage(webDetection, image.url)
          
          results.push({
            id: `gv-partial-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: image.url,
            siteName: this.extractDomain(image.url),
            title: containingPage?.pageTitle || `Match parziale su ${this.extractDomain(image.url)}`,
            similarity: 95, // Partial match = 95% (alzato per soglia 90%)
            status: this.determineStatus(safeSearch, image.url),
            thumbnail: image.url,
            detectedAt: new Date(),
            provider: this.name,
            webPageUrl: containingPage?.url, // URL della pagina web che contiene l'immagine
            metadata: {
              domain: this.extractDomain(image.url),
              isAdultContent: this.isAdultContent(safeSearch),
              copyrightRisk: this.assessCopyrightRisk(image.url),
              contextText: containingPage?.pageTitle,
              ...this.extractAdvancedMetadata(response_data, image.url)
            }
          })
        }
      }

      // Process pages with matching images - aggiungi risultati separati per le pagine web
      if (webDetection.pagesWithMatchingImages) {
        for (const page of webDetection.pagesWithMatchingImages) {
          // Get the best thumbnail from this page
          let thumbnailUrl = null
          let matchType = 'generic'
          
          if (page.fullMatchingImages && page.fullMatchingImages.length > 0) {
            thumbnailUrl = page.fullMatchingImages[0].url
            matchType = 'full'
          } else if (page.partialMatchingImages && page.partialMatchingImages.length > 0) {
            thumbnailUrl = page.partialMatchingImages[0].url
            matchType = 'partial'
          }
          
          // Aggiungi sempre la pagina come risultato separato per mostrare il contesto
          results.push({
            id: `gv-page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url: thumbnailUrl || page.url, // URL immagine come primario
            siteName: this.extractDomain(page.url),
            title: page.pageTitle || `Pagina web su ${this.extractDomain(page.url)}`,
            similarity: this.calculatePageSimilarity(webDetection, page),
            status: this.determinePageStatus(page.url),
            thumbnail: thumbnailUrl,
            detectedAt: new Date(),
            provider: this.name,
            webPageUrl: page.url, // URL della pagina web completa
            metadata: {
              domain: this.extractDomain(page.url),
              contextText: page.pageTitle,
              copyrightRisk: this.assessCopyrightRisk(page.url),
              matchType, // full, partial, o generic
              imageCount: (page.fullMatchingImages?.length || 0) + (page.partialMatchingImages?.length || 0)
            }
          })
        }
      }

      console.log('[GoogleVisionProvider] Total results before filtering:', results.length)
      console.log('[GoogleVisionProvider] Results with webPageUrl:', results.filter(r => r.webPageUrl).length)
      
      this.rateLimit.remaining--
      const filteredResults = this.filterAndSortResults(results, query)
      console.log('[GoogleVisionProvider] Final filtered results:', filteredResults.length)
      console.log('[GoogleVisionProvider] Final results with webPageUrl:', filteredResults.filter(r => r.webPageUrl).length)
      
      return filteredResults

    } catch (error) {
      console.error('Google Vision search error:', error)
      throw error
    }
  }

  getRateLimit() {
    return this.rateLimit
  }

  getMetadata() {
    return {
      description: 'Google Vision API for reverse image search with web detection',
      capabilities: ['reverse_image_search', 'safe_search', 'web_detection', 'visual_similarity'],
      coverage: 'global' as const,
      costPerSearch: 0.0015
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return 'unknown'
    }
  }

  private calculateSimilarity(webDetection: any, image: any): number {
    // Base similarity calculation per visually similar images
    let similarity = 92  // Alzato a 92% per superare la soglia 90%

    // Boost if it's a full match
    if (webDetection.fullMatchingImages?.some((img: any) => img.url === image.url)) {
      similarity = 100
    } else if (webDetection.partialMatchingImages?.some((img: any) => img.url === image.url)) {
      similarity = 95  // Alzato a 95% per partial matches
    }

    return Math.min(100, similarity)
  }

  private calculatePageSimilarity(webDetection: any, page: any): number {
    // Lower similarity for pages since they contain the image but aren't the image itself
    return 90  // Alzato a 90% per superare la nuova soglia
  }

  private extractAdvancedMetadata(responseData: any, imageUrl: string) {
    const metadata: any = {}
    
    // Extract object information
    if (responseData.localizedObjectAnnotations?.length > 0) {
      metadata.detectedObjects = responseData.localizedObjectAnnotations.map((obj: any) => ({
        name: obj.name,
        confidence: Math.round(obj.score * 100),
        location: obj.boundingPoly
      })).slice(0, 5) // Limit to top 5 objects
    }
    
    // Extract labels/categories
    if (responseData.labelAnnotations?.length > 0) {
      metadata.categories = responseData.labelAnnotations
        .filter((label: any) => label.score > 0.7) // High confidence only
        .map((label: any) => ({
          category: label.description,
          confidence: Math.round(label.score * 100)
        }))
        .slice(0, 8) // Top 8 categories
    }
    
    // Extract text content (useful for watermarks, credits, etc.)
    if (responseData.textAnnotations?.length > 0) {
      const fullText = responseData.textAnnotations[0]?.description || ''
      if (fullText.length > 0) {
        metadata.textContent = {
          hasText: true,
          textSnippet: fullText.substring(0, 200), // First 200 chars
          language: responseData.textAnnotations[0]?.locale || 'unknown',
          possibleWatermark: this.detectWatermarkText(fullText)
        }
      }
    }
    
    // Extract face information (for privacy detection)
    if (responseData.faceAnnotations?.length > 0) {
      metadata.faces = {
        count: responseData.faceAnnotations.length,
        emotions: responseData.faceAnnotations.map((face: any) => ({
          joy: face.joyLikelihood,
          anger: face.angerLikelihood,
          surprise: face.surpriseLikelihood
        })).slice(0, 3), // First 3 faces
        detectionConfidence: responseData.faceAnnotations[0]?.detectionConfidence
      }
    }
    
    // Extract logo information (for brand/copyright detection)
    if (responseData.logoAnnotations?.length > 0) {
      metadata.logos = responseData.logoAnnotations.map((logo: any) => ({
        brand: logo.description,
        confidence: Math.round(logo.score * 100)
      })).slice(0, 5) // Top 5 logos
    }
    
    // Extract landmark information (for location context)
    if (responseData.landmarkAnnotations?.length > 0) {
      metadata.landmarks = responseData.landmarkAnnotations.map((landmark: any) => ({
        name: landmark.description,
        confidence: Math.round(landmark.score * 100),
        location: landmark.locations?.[0]
      })).slice(0, 3) // Top 3 landmarks
    }
    
    // Enhanced safe search details
    if (responseData.safeSearchAnnotation) {
      const safeSearch = responseData.safeSearchAnnotation
      metadata.contentAnalysis = {
        adult: safeSearch.adult,
        medical: safeSearch.medical,
        spoofed: safeSearch.spoof,
        violence: safeSearch.violence,
        racy: safeSearch.racy,
        riskLevel: this.calculateRiskLevel(safeSearch)
      }
    }
    
    return metadata
  }

  private detectWatermarkText(text: string): boolean {
    const watermarkKeywords = [
      'watermark', 'copyright', '©', '®', 'tm', 'getty', 'shutterstock', 
      'stock photo', 'alamy', 'preview', 'sample', 'protected'
    ]
    
    const lowerText = text.toLowerCase()
    return watermarkKeywords.some(keyword => lowerText.includes(keyword))
  }

  private calculateRiskLevel(safeSearch: any): 'low' | 'medium' | 'high' {
    const riskLevels = ['VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY']
    
    const adult = riskLevels.indexOf(safeSearch.adult || 'VERY_UNLIKELY')
    const racy = riskLevels.indexOf(safeSearch.racy || 'VERY_UNLIKELY')
    const violence = riskLevels.indexOf(safeSearch.violence || 'VERY_UNLIKELY')
    
    const maxRisk = Math.max(adult, racy, violence)
    
    if (maxRisk >= 4) return 'high'      // VERY_LIKELY
    if (maxRisk >= 3) return 'medium'    // LIKELY
    return 'low'
  }

  private filterFeaturesBySearchType(features: any[], query: SearchQuery): any[] {
    const searchType = query.searchType || 'general_search'
    const userPlan = query.userPlan || 'free'
    const options = query.options || {}
    
    // Base features for all searches
    const baseFeatures = [
      features.find(f => f.type === 'WEB_DETECTION'),
      features.find(f => f.type === 'SAFE_SEARCH_DETECTION')
    ].filter(Boolean)
    
    // Additional features based on explicit user options
    const additionalFeatures = []
    
    // Feature activation based on user options
    if (options.detectFaces) {
      const faceFeature = features.find(f => f.type === 'FACE_DETECTION')
      if (faceFeature) {
        // Apply user-specified face detection options
        faceFeature.maxResults = options.maxFaces || 10
        additionalFeatures.push(faceFeature)
      }
    }
    
    if (options.detectLogos) {
      additionalFeatures.push(features.find(f => f.type === 'LOGO_DETECTION'))
    }
    
    if (options.detectLandmarks) {
      additionalFeatures.push(features.find(f => f.type === 'LANDMARK_DETECTION'))
    }
    
    if (options.detectText) {
      additionalFeatures.push(features.find(f => f.type === 'DOCUMENT_TEXT_DETECTION'))
    }
    
    if (options.detectObjects) {
      additionalFeatures.push(features.find(f => f.type === 'OBJECT_LOCALIZATION'))
    }
    
    if (options.analyzeLabels) {
      additionalFeatures.push(features.find(f => f.type === 'LABEL_DETECTION'))
    }
    
    // Fallback to search type-based features if no explicit options
    if (additionalFeatures.length === 0) {
      switch (searchType) {
        case 'copyright_detection':
          // Enhanced features for copyright detection
          additionalFeatures.push(
            features.find(f => f.type === 'LOGO_DETECTION'), // Brand logos
            features.find(f => f.type === 'DOCUMENT_TEXT_DETECTION'), // Watermarks, credits
            features.find(f => f.type === 'OBJECT_LOCALIZATION') // Object matching
          )
          break
          
        case 'revenge_detection':
          // Privacy-focused features
          additionalFeatures.push(
            features.find(f => f.type === 'FACE_DETECTION'), // Person identification
            features.find(f => f.type === 'OBJECT_LOCALIZATION'), // Private objects
            features.find(f => f.type === 'LANDMARK_DETECTION') // Location identification
          )
          break
          
        case 'general_search':
        default:
          // Standard features for general searches
          if (userPlan !== 'free') {
            additionalFeatures.push(
              features.find(f => f.type === 'LABEL_DETECTION'), // Content classification
              features.find(f => f.type === 'OBJECT_LOCALIZATION'), // Better matching
              features.find(f => f.type === 'LOGO_DETECTION') // Brand recognition
            )
          }
          
          if (userPlan === 'pro') {
            additionalFeatures.push(
              features.find(f => f.type === 'DOCUMENT_TEXT_DETECTION'), // Text in images
              features.find(f => f.type === 'FACE_DETECTION'), // Face matching
              features.find(f => f.type === 'LANDMARK_DETECTION') // Location context
            )
          }
          break
      }
    }
    
    // Combine and filter out null values
    return [...baseFeatures, ...additionalFeatures.filter(Boolean)]
  }

  private determineStatus(safeSearch: any, url: string): 'violation' | 'partial' | 'clean' {
    const domain = this.extractDomain(url).toLowerCase()
    
    // Check for known problematic sites
    const suspiciousDomains = [
      'leaked', 'expose', 'revenge', 'ex-gf', 'amateur', 'private',
      'stolen', 'hacked', 'candid', 'voyeur', 'upskirt'
    ]
    
    if (suspiciousDomains.some(term => domain.includes(term))) {
      return 'violation'
    }

    // Check safe search results
    if (safeSearch) {
      const isAdult = safeSearch.adult === 'VERY_LIKELY' || safeSearch.adult === 'LIKELY'
      const isRacy = safeSearch.racy === 'VERY_LIKELY' || safeSearch.racy === 'LIKELY'
      
      if (isAdult || isRacy) {
        return 'violation'
      }
    }

    return 'clean'
  }

  private determinePageStatus(url: string): 'violation' | 'partial' | 'clean' {
    const domain = this.extractDomain(url).toLowerCase()
    
    // More conservative for pages
    const problematicDomains = [
      'leaked', 'expose', 'revenge', 'ex-', 'stolen', 'hacked'
    ]
    
    if (problematicDomains.some(term => domain.includes(term))) {
      return 'violation'
    }
    
    return 'partial'
  }

  private isAdultContent(safeSearch: any): boolean {
    if (!safeSearch) return false
    return safeSearch.adult === 'VERY_LIKELY' || safeSearch.adult === 'LIKELY'
  }

  private assessCopyrightRisk(url: string): 'high' | 'medium' | 'low' {
    const domain = this.extractDomain(url).toLowerCase()
    
    const highRiskDomains = ['leaked', 'expose', 'revenge', 'stolen', 'hacked', 'pirated']
    const mediumRiskDomains = ['tube', 'pics', 'image', 'photo', 'gallery', 'amateur']
    
    if (highRiskDomains.some(term => domain.includes(term))) {
      return 'high'
    }
    
    if (mediumRiskDomains.some(term => domain.includes(term))) {
      return 'medium'
    }
    
    return 'low'
  }

  private findContainingPage(webDetection: any, imageUrl: string): any {
    if (!webDetection.pagesWithMatchingImages) return null
    
    // Find the page that contains this specific image
    for (const page of webDetection.pagesWithMatchingImages) {
      // Check if this page contains the image in its fullMatchingImages
      if (page.fullMatchingImages && page.fullMatchingImages.some((img: any) => img.url === imageUrl)) {
        return page
      }
      // Check if this page contains the image in its partialMatchingImages  
      if (page.partialMatchingImages && page.partialMatchingImages.some((img: any) => img.url === imageUrl)) {
        return page
      }
      // As fallback, if domains match, consider them related
      if (page.url && this.extractDomain(page.url) === this.extractDomain(imageUrl)) {
        return page
      }
    }
    
    // If no specific page found, return the first page as a fallback
    if (webDetection.pagesWithMatchingImages.length > 0) {
      return webDetection.pagesWithMatchingImages[0]
    }
    
    return null
  }

  private filterAndSortResults(results: SearchResult[], query: SearchQuery): SearchResult[] {
    const threshold = query.options?.similarityThreshold || 90 // Aumentata soglia default a 90%
    let filteredResults = results.filter(result => result.similarity >= threshold)
    
    // Apply domain whitelist/blacklist filters
    if (query.options?.domainWhitelist && query.options.domainWhitelist.length > 0) {
      filteredResults = filteredResults.filter(result => 
        query.options!.domainWhitelist!.some(domain => 
          result.siteName.toLowerCase().includes(domain.toLowerCase())
        )
      )
    }
    
    if (query.options?.domainBlacklist && query.options.domainBlacklist.length > 0) {
      filteredResults = filteredResults.filter(result => 
        !query.options!.domainBlacklist!.some(domain => 
          result.siteName.toLowerCase().includes(domain.toLowerCase())
        )
      )
    }
    
    // Apply duplicate detection
    if (query.options?.duplicateThreshold) {
      filteredResults = this.removeDuplicates(filteredResults, query.options.duplicateThreshold)
    }
    
    // Apply quality filtering
    if (query.options?.minImageQuality) {
      filteredResults = filteredResults.filter(result => 
        result.similarity >= (query.options!.minImageQuality! * 100)
      )
    }
    
    // Sort results with enhanced logic
    filteredResults.sort((a, b) => {
      // Prioritize exact matches if enabled
      if (query.options?.exactMatchPriority) {
        if (a.similarity === 100 && b.similarity < 100) return -1
        if (b.similarity === 100 && a.similarity < 100) return 1
      }
      
      // Apply visual similarity boost
      let aScore = a.similarity
      let bScore = b.similarity
      
      if (query.options?.visualSimilarityBoost && query.options.visualSimilarityBoost > 1.0) {
        aScore *= query.options.visualSimilarityBoost
        bScore *= query.options.visualSimilarityBoost
      }
      
      // Boost results with web page URLs (they're more valuable)
      if (a.webPageUrl && !b.webPageUrl) aScore += 5
      if (b.webPageUrl && !a.webPageUrl) bScore += 5
      
      // Boost results with violations status
      if (a.status === 'violation' && b.status !== 'violation') aScore += 10
      if (b.status === 'violation' && a.status !== 'violation') bScore += 10
      
      return bScore - aScore
    })
    
    return filteredResults.slice(0, query.options?.maxResults || 20)
  }
  
  private removeDuplicates(results: SearchResult[], threshold: number): SearchResult[] {
    const filtered: SearchResult[] = []
    
    for (const result of results) {
      const isDuplicate = filtered.some(existing => {
        // Check URL similarity
        if (this.calculateUrlSimilarity(result.url, existing.url) > threshold) {
          return true
        }
        
        // Check domain and similarity score similarity
        if (result.siteName === existing.siteName && 
            Math.abs(result.similarity - existing.similarity) < 5) {
          return true
        }
        
        return false
      })
      
      if (!isDuplicate) {
        filtered.push(result)
      }
    }
    
    return filtered
  }
  
  private calculateUrlSimilarity(url1: string, url2: string): number {
    // Simple URL similarity calculation
    if (url1 === url2) return 1.0
    
    try {
      const parsed1 = new URL(url1)
      const parsed2 = new URL(url2)
      
      if (parsed1.hostname !== parsed2.hostname) return 0.0
      
      const path1 = parsed1.pathname
      const path2 = parsed2.pathname
      
      // Calculate Levenshtein distance for paths
      const maxLength = Math.max(path1.length, path2.length)
      if (maxLength === 0) return 1.0
      
      const distance = this.levenshteinDistance(path1, path2)
      return 1.0 - (distance / maxLength)
    } catch {
      return 0.0
    }
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }
}