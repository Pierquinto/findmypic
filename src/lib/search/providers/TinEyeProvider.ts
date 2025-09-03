import { SearchProvider, SearchQuery, SearchResult } from '../types'
import crypto from 'crypto'

export class TinEyeProvider implements SearchProvider {
  name = 'TinEye API'
  private apiKey: string
  private privateKey: string
  private baseUrl = 'https://api.tineye.com/rest'
  private rateLimit = { remaining: 1000, resetTime: new Date() }

  constructor(apiKey: string, privateKey: string) {
    this.apiKey = apiKey
    this.privateKey = privateKey
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/remaining/')
      return response.ok
    } catch {
      return false
    }
  }

  async search(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // Convert base64 to buffer for upload
      const imageBuffer = Buffer.from(
        query.imageData.replace(/^data:image\/[a-z]+;base64,/, ''), 
        'base64'
      )

      // First, upload the image
      const uploadResponse = await this.uploadImage(imageBuffer)
      if (!uploadResponse.ok) {
        throw new Error(`TinEye upload failed: ${uploadResponse.statusText}`)
      }

      const uploadData = await uploadResponse.json()
      const imageId = uploadData.results[0]

      // Then search for matches
      const searchResponse = await this.makeRequest('/search/', {
        image_upload: imageId,
        limit: query.options?.maxResults || 20,
        offset: 0,
        sort: 'score',
        order: 'desc'
      })

      if (!searchResponse.ok) {
        throw new Error(`TinEye search failed: ${searchResponse.statusText}`)
      }

      const searchData = await searchResponse.json()
      
      const results: SearchResult[] = searchData.results.matches.map((match: any) => ({
        id: `te-${match.image_url.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now()}`,
        url: match.image_url,
        siteName: this.extractDomain(match.image_url),
        title: match.domain,
        similarity: this.calculateSimilarity(match.score),
        status: this.determineStatus(match.image_url, match.domain),
        thumbnail: match.image_url,
        detectedAt: new Date(),
        provider: this.name,
        metadata: {
          imageSize: {
            width: match.width,
            height: match.height
          },
          domain: match.domain,
          copyrightRisk: this.assessCopyrightRisk(match.image_url, match.domain)
        }
      }))

      this.rateLimit.remaining--
      return this.filterResults(results, query)

    } catch (error) {
      console.error('TinEye search error:', error)
      throw error
    }
  }

  getRateLimit() {
    return this.rateLimit
  }

  getMetadata() {
    return {
      description: 'TinEye reverse image search API - specialized in finding exact matches',
      capabilities: ['reverse_image_search', 'exact_match', 'modification_detection'],
      coverage: 'global' as const,
      costPerSearch: 0.20
    }
  }

  private async uploadImage(imageBuffer: Buffer): Promise<Response> {
    const formData = new FormData()
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('image_upload', blob)

    return this.makeRequest('/upload/', undefined, formData)
  }

  private async makeRequest(endpoint: string, params?: Record<string, any>, formData?: FormData): Promise<Response> {
    const nonce = Date.now().toString()
    const httpVerb = formData ? 'POST' : 'GET'
    
    let url = `${this.baseUrl}${endpoint}`
    let requestParams: Record<string, string> = {
      api_key: this.apiKey,
      nonce
    }

    if (params) {
      Object.assign(requestParams, params)
    }

    // Create signature
    const sortedParams = Object.keys(requestParams)
      .sort()
      .map(key => `${key}=${requestParams[key]}`)
      .join('&')
    
    const stringToSign = this.privateKey + httpVerb + url + sortedParams
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex')
    
    requestParams.api_sig = signature

    const options: RequestInit = {
      method: httpVerb,
      headers: {}
    }

    if (formData) {
      // Add params to form data for POST requests
      Object.entries(requestParams).forEach(([key, value]) => {
        formData.append(key, value)
      })
      options.body = formData
    } else {
      // Add params to URL for GET requests
      const urlParams = new URLSearchParams(requestParams)
      url += `?${urlParams.toString()}`
    }

    return fetch(url, options)
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return 'unknown'
    }
  }

  private calculateSimilarity(score: number): number {
    // TinEye score is typically 0-100, but can be higher
    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score))
  }

  private determineStatus(imageUrl: string, domain: string): 'violation' | 'partial' | 'clean' {
    const domainLower = domain.toLowerCase()
    const urlLower = imageUrl.toLowerCase()
    
    // High-risk indicators
    const violationIndicators = [
      'leaked', 'expose', 'revenge', 'ex-gf', 'ex-bf', 'stolen', 'hacked',
      'private', 'candid', 'voyeur', 'amateur', 'teen', 'young'
    ]
    
    // Medium-risk indicators
    const partialIndicators = [
      'tube', 'pics', 'gallery', 'photo', 'image', 'upload'
    ]
    
    if (violationIndicators.some(term => 
      domainLower.includes(term) || urlLower.includes(term)
    )) {
      return 'violation'
    }
    
    if (partialIndicators.some(term => 
      domainLower.includes(term) || urlLower.includes(term)
    )) {
      return 'partial'
    }
    
    return 'clean'
  }

  private assessCopyrightRisk(imageUrl: string, domain: string): 'high' | 'medium' | 'low' {
    const domainLower = domain.toLowerCase()
    
    const highRiskDomains = [
      'leaked', 'expose', 'revenge', 'stolen', 'hacked', 'pirated',
      'torrent', 'download', 'free'
    ]
    
    const mediumRiskDomains = [
      'tube', 'pics', 'gallery', 'amateur', 'user', 'upload',
      'share', 'host', 'image'
    ]
    
    if (highRiskDomains.some(term => domainLower.includes(term))) {
      return 'high'
    }
    
    if (mediumRiskDomains.some(term => domainLower.includes(term))) {
      return 'medium'
    }
    
    // Check for social media platforms (medium risk due to user-generated content)
    const socialPlatforms = ['twitter', 'instagram', 'facebook', 'reddit', 'tumblr', 'pinterest']
    if (socialPlatforms.some(platform => domainLower.includes(platform))) {
      return 'medium'
    }
    
    return 'low'
  }

  private filterResults(results: SearchResult[], query: SearchQuery): SearchResult[] {
    const threshold = query.options?.similarityThreshold || 80 // TinEye is more precise, higher threshold
    
    return results
      .filter(result => result.similarity >= threshold)
      .slice(0, query.options?.maxResults || 20)
  }
}