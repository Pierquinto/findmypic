import { SearchEngine } from './SearchEngine'
import { GoogleVisionProvider } from './providers/GoogleVisionProvider'
import { TinEyeProvider } from './providers/TinEyeProvider'
import { ProprietaryProvider } from './providers/ProprietaryProvider'
import { getConfigForUser } from './config'

// Cache per istanze di SearchEngine per evitare ricreazioni frequenti
const engineCache = new Map<string, SearchEngine>()

export class SearchEngineFactory {
  
  static createEngine(
    userPlan: 'free' | 'basic' | 'pro',
    searchType: 'revenge_detection' | 'copyright_detection' | 'general_search' = 'general_search',
    securityLevel: 'fast' | 'standard' | 'deep' = 'standard'
  ): SearchEngine {
    
    const cacheKey = `${userPlan}-${searchType}-${securityLevel}`
    
    // Riutilizza istanza in cache se disponibile
    if (engineCache.has(cacheKey)) {
      return engineCache.get(cacheKey)!
    }
    
    // Crea nuova configurazione
    const config = getConfigForUser(userPlan, searchType, securityLevel)
    const engine = new SearchEngine(config)
    
    // Registra provider disponibili
    this.registerProviders(engine, config)
    
    // Cache l'istanza
    engineCache.set(cacheKey, engine)
    
    return engine
  }
  
  private static registerProviders(engine: SearchEngine, config: any): void {
    
    // Provider proprietario (sempre disponibile)
    if (config.providers.proprietary?.enabled) {
      const proprietaryProvider = new ProprietaryProvider()
      engine.registerProvider('proprietary', proprietaryProvider)
    }
    
    // Google Vision API
    if (config.providers.google_vision?.enabled && config.providers.google_vision.apiKey) {
      const googleProvider = new GoogleVisionProvider(config.providers.google_vision.apiKey)
      engine.registerProvider('google_vision', googleProvider)
    }
    
    // TinEye API
    if (config.providers.tineye?.enabled && config.providers.tineye.apiKey) {
      const tineyeProvider = new TinEyeProvider(
        config.providers.tineye.apiKey,
        process.env.TINEYE_PRIVATE_KEY!
      )
      engine.registerProvider('tineye', tineyeProvider)
    }
    
    // Yandex Images (implementazione futura)
    if (config.providers.yandex?.enabled && config.providers.yandex.apiKey) {
      // const yandexProvider = new YandexProvider(config.providers.yandex.apiKey)
      // engine.registerProvider('yandex', yandexProvider)
    }
    
    // Bing Visual Search (implementazione futura)
    if (config.providers.bing_visual?.enabled && config.providers.bing_visual.apiKey) {
      // const bingProvider = new BingVisualProvider(config.providers.bing_visual.apiKey)
      // engine.registerProvider('bing_visual', bingProvider)
    }
  }
  
  // Utility per ottenere statistiche di tutti i provider
  static async getGlobalProviderStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {}
    
    // Crea engine temporaneo con configurazione completa per testare tutti i provider
    const tempEngine = this.createEngine('pro', 'general_search', 'standard')
    const providerStats = await tempEngine.getProviderStats()
    
    return {
      providers: providerStats,
      cacheSize: engineCache.size,
      availableProviders: Object.keys(providerStats).filter(
        key => providerStats[key].isEnabled && providerStats[key].isAvailable
      )
    }
  }
  
  // Pulizia cache
  static clearCache(): void {
    engineCache.clear()
  }
  
  // Ottieni engine per ricerche specifiche
  static createRevengeDetectionEngine(userPlan: 'free' | 'basic' | 'pro'): SearchEngine {
    return this.createEngine(userPlan, 'revenge_detection', 'deep')
  }
  
  static createCopyrightDetectionEngine(userPlan: 'free' | 'basic' | 'pro'): SearchEngine {
    return this.createEngine(userPlan, 'copyright_detection', 'standard')
  }
  
  static createFastSearchEngine(userPlan: 'free' | 'basic' | 'pro'): SearchEngine {
    return this.createEngine(userPlan, 'general_search', 'fast')
  }
  
  // Validazione configurazioni di sistema
  static validateSystemConfiguration(): {
    isValid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []
    
    // Controlla variabili d'ambiente
    if (!process.env.GOOGLE_VISION_API_KEY) {
      warnings.push('Google Vision API key not configured - provider disabled')
    }
    
    if (!process.env.TINEYE_API_KEY || !process.env.TINEYE_PRIVATE_KEY) {
      warnings.push('TinEye API credentials not configured - provider disabled')
    }
    
    if (!process.env.YANDEX_API_KEY) {
      warnings.push('Yandex API key not configured - provider disabled')
    }
    
    if (!process.env.BING_SEARCH_API_KEY) {
      warnings.push('Bing Visual Search API key not configured - provider disabled')
    }
    
    // Controlla che almeno un provider sia disponibile
    const hasProprietaryProvider = true // Sempre disponibile
    const hasExternalProviders = !!(
      process.env.GOOGLE_VISION_API_KEY || 
      process.env.TINEYE_API_KEY ||
      process.env.YANDEX_API_KEY ||
      process.env.BING_SEARCH_API_KEY
    )
    
    if (!hasProprietaryProvider && !hasExternalProviders) {
      errors.push('No search providers configured - search functionality will not work')
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }
}

// Export per facilitare l'uso
export const createSearchEngine = SearchEngineFactory.createEngine
export const createRevengeDetectionEngine = SearchEngineFactory.createRevengeDetectionEngine
export const createCopyrightDetectionEngine = SearchEngineFactory.createCopyrightDetectionEngine
export const createFastSearchEngine = SearchEngineFactory.createFastSearchEngine