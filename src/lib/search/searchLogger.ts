import { prisma } from '@/lib/prisma'
import { imageStorage } from '@/lib/storage/imageStorage'
import { encryptSensitiveData } from '@/lib/encryption'

interface SearchLogData {
  searchId: string
  userId?: string
  email?: string
  imageData?: string
  imageHash?: string
  ipAddress?: string
  userAgent?: string
  searchType: string
  searchQuery: any
  geoLocation?: {
    country?: string
    city?: string
    region?: string
    timezone?: string
    isp?: string
  }
}

interface SearchStepLog {
  step: string
  timestamp: number
  duration?: number
  provider?: string
  success: boolean
  results?: any[]
  error?: string
  warning?: string
  apiCalls?: number
}

export class SearchLogger {
  private searchId: string
  private logData: SearchLogData
  private steps: SearchStepLog[] = []
  private startTime: number
  private providersAttempted: string[] = []
  private providersSuccessful: string[] = []
  private providersFailed: { provider: string, error: string }[] = []
  private totalApiCalls: number = 0
  private imageStoragePath?: string
  private imagePublicUrl?: string

  constructor(searchId: string, logData: SearchLogData) {
    this.searchId = searchId
    this.logData = logData
    this.startTime = Date.now()
    
    this.logStep({
      step: 'search_initiated',
      timestamp: this.startTime,
      success: true
    })
  }

  /**
   * Salva l'immagine processata
   */
  async saveProcessedImage(): Promise<void> {
    if (!this.logData.imageData) return

    try {
      const imageResult = await imageStorage.saveImage(
        this.logData.imageData,
        {
          uploadedBy: this.logData.userId,
          originalName: `search_${this.searchId}`
        }
      )

      this.imageStoragePath = imageResult.storagePath
      this.imagePublicUrl = imageResult.publicUrl
      
      console.log('SearchLogger saved image:', {
        storagePath: this.imageStoragePath,
        publicUrl: this.imagePublicUrl
      })

      this.logStep({
        step: 'image_stored',
        timestamp: Date.now(),
        success: true
      })

    } catch (error) {
      this.logStep({
        step: 'image_storage_failed',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Ottieni informazioni geografiche dall'IP
   */
  async detectGeoLocation(ipAddress: string): Promise<void> {
    try {
      // Per ora usiamo un servizio mock, in produzione useresti un servizio reale
      // come ip-api.com, ipinfo.io, etc.
      
      // Mock geolocation per sviluppo
      const mockGeoData = {
        country: 'Italy',
        city: 'Milan',
        region: 'Lombardy',
        timezone: 'Europe/Rome',
        isp: 'Mock ISP'
      }

      this.logData.geoLocation = mockGeoData

      this.logStep({
        step: 'geolocation_detected',
        timestamp: Date.now(),
        success: true
      })

    } catch (error) {
      this.logStep({
        step: 'geolocation_failed',
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : 'Geolocation failed'
      })
    }
  }

  /**
   * Log di un singolo step di ricerca
   */
  logStep(stepData: Omit<SearchStepLog, 'timestamp'> & { timestamp?: number }): void {
    const step: SearchStepLog = {
      ...stepData,
      timestamp: stepData.timestamp || Date.now()
    }

    // Calcola durata se è il primo step con lo stesso nome
    if (this.steps.length > 0) {
      step.duration = step.timestamp - this.steps[this.steps.length - 1].timestamp
    }

    this.steps.push(step)

    // Aggiorna contatori provider
    if (step.provider && !this.providersAttempted.includes(step.provider)) {
      this.providersAttempted.push(step.provider)
    }

    if (step.success && step.provider && step.results && step.results.length > 0) {
      if (!this.providersSuccessful.includes(step.provider)) {
        this.providersSuccessful.push(step.provider)
      }
    }

    if (!step.success && step.provider && step.error) {
      this.providersFailed.push({
        provider: step.provider,
        error: step.error
      })
    }

    if (step.apiCalls) {
      this.totalApiCalls += step.apiCalls
    }

    console.log(`[SearchLogger] ${step.step}: ${step.success ? 'SUCCESS' : 'FAILED'}${step.provider ? ` (${step.provider})` : ''}`)
  }

  /**
   * Log ricerca provider
   */
  logProviderSearch(
    provider: string,
    success: boolean,
    results: any[] = [],
    error?: string,
    apiCalls: number = 1
  ): void {
    this.logStep({
      step: `provider_search`,
      provider,
      success,
      results,
      error,
      apiCalls
    })
  }

  /**
   * Log warning
   */
  logWarning(message: string, context?: any): void {
    this.logStep({
      step: 'warning',
      success: true,
      warning: message
    })
  }

  /**
   * Salva tutti i log nel database
   */
  async saveLogs(status: 'completed' | 'failed' | 'timeout' = 'completed', totalResults: number = 0): Promise<void> {
    try {
      const endTime = Date.now()
      const totalDuration = endTime - this.startTime

      // Prepara i dati per il database
      // Ottieni informazioni sull'immagine se salvata
      const imageSize = this.imageStoragePath ? await this.getImageSize() : null
      const imageMimeType = this.detectMimeType(this.logData.imageData)
      
      const logRecord = {
        searchId: this.searchId,
        userId: this.logData.userId || null,
        email: this.logData.email || null,
        imageStoragePath: this.imageStoragePath || null,
        imageHash: this.logData.imageHash || null,
        imageSize,
        imageMimeType,
        ipAddress: this.logData.ipAddress ? encryptSensitiveData(this.logData.ipAddress) : null,
        userAgent: this.logData.userAgent ? encryptSensitiveData(this.logData.userAgent) : null,
        geoLocation: this.logData.geoLocation || null,
        searchType: this.logData.searchType,
        searchQuery: this.logData.searchQuery || null,
        providersAttempted: this.providersAttempted,
        providersSuccessful: this.providersSuccessful,
        providersFailed: this.providersFailed,
        totalResults,
        searchTimeMs: totalDuration,
        processingSteps: this.steps,
        errorLogs: this.steps.filter(s => !s.success).map(s => ({
          step: s.step,
          error: s.error,
          timestamp: s.timestamp
        })),
        warnings: this.steps.filter(s => s.warning).map(s => ({
          step: s.step,
          warning: s.warning,
          timestamp: s.timestamp
        })),
        apiCallsCount: this.totalApiCalls,
        status
      }

      await prisma.searchLog.create({ data: logRecord })

      console.log(`[SearchLogger] Search log saved for ${this.searchId} (${totalDuration}ms, ${this.totalApiCalls} API calls)`)

    } catch (error) {
      console.error('Error saving search log:', error)
      // Non propaghiamo l'errore per evitare che interrompa la ricerca
    }
  }

  /**
   * Ottieni dimensione immagine dal storage
   */
  private async getImageSize(): Promise<number | null> {
    if (!this.imageStoragePath) return null
    
    try {
      const imageData = await imageStorage.getImage(this.imageStoragePath)
      return imageData?.buffer.length || null
    } catch {
      return null
    }
  }

  /**
   * Rileva tipo MIME dell'immagine
   */
  private detectMimeType(imageData?: string): string | null {
    if (!imageData) return null
    
    const mimeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/)
    return mimeMatch ? mimeMatch[1] : 'image/jpeg'
  }

  /**
   * Ottieni il path dell'immagine salvata
   */
  getImagePath(): string | null {
    return this.imageStoragePath || null
  }

  /**
   * Ottieni l'URL pubblico dell'immagine salvata
   */
  getImageUrl(): string | null {
    return this.imagePublicUrl || null
  }

  /**
   * Ottieni statistiche della ricerca
   */
  getStats() {
    return {
      searchId: this.searchId,
      duration: Date.now() - this.startTime,
      totalSteps: this.steps.length,
      providersAttempted: this.providersAttempted.length,
      providersSuccessful: this.providersSuccessful.length,
      providersFailed: this.providersFailed.length,
      totalApiCalls: this.totalApiCalls,
      hasImage: !!this.imageStoragePath
    }
  }
}