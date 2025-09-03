import { SearchEngineConfig } from './types'

export const defaultSearchConfig: SearchEngineConfig = {
  providers: {
    'proprietary': {
      enabled: true,
      priority: 10, // Massima priorità per il nostro sistema
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerDay: 10000
      },
      fallbackProviders: ['google_vision', 'tineye']
    },
    'google_vision': {
      enabled: process.env.GOOGLE_VISION_API_KEY ? true : false,
      priority: 8,
      apiKey: process.env.GOOGLE_VISION_API_KEY,
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerDay: 1000
      },
      fallbackProviders: ['tineye', 'proprietary']
    },
    'tineye': {
      enabled: process.env.TINEYE_API_KEY && process.env.TINEYE_PRIVATE_KEY ? true : false,
      priority: 9, // Alta priorità per precisione
      apiKey: process.env.TINEYE_API_KEY,
      rateLimit: {
        requestsPerMinute: 5,
        requestsPerDay: 150
      },
      fallbackProviders: ['google_vision', 'proprietary']
    },
    'yandex': {
      enabled: process.env.YANDEX_API_KEY ? true : false,
      priority: 6,
      apiKey: process.env.YANDEX_API_KEY,
      baseUrl: 'https://yandex.com/images/search',
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerDay: 1000
      }
    },
    'bing_visual': {
      enabled: process.env.BING_SEARCH_API_KEY ? true : false,
      priority: 5,
      apiKey: process.env.BING_SEARCH_API_KEY,
      baseUrl: 'https://api.bing.microsoft.com/v7.0/images/visualsearch',
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerDay: 3000
      }
    }
  },
  aggregation: {
    deduplicationThreshold: 0.85, // 85% similarità per considerare duplicati
    minimumSimilarity: 70, // Soglia minima per includere risultati (alzata da 60)
    maxResultsPerProvider: 25, // Max risultati per provider
    timeoutMs: 30000 // 30 secondi timeout per provider
  }
}

export const planBasedConfigs = {
  free: {
    ...defaultSearchConfig,
    providers: {
      // Solo provider proprietario per utenti free
      proprietary: {
        ...defaultSearchConfig.providers.proprietary,
        enabled: true
      }
    },
    aggregation: {
      ...defaultSearchConfig.aggregation,
      maxResultsPerProvider: 10, // Limitato per utenti free
      timeoutMs: 15000 // Timeout più breve
    }
  },
  basic: {
    ...defaultSearchConfig,
    providers: {
      // Provider proprietario + Google Vision
      proprietary: defaultSearchConfig.providers.proprietary,
      google_vision: defaultSearchConfig.providers.google_vision
    },
    aggregation: {
      ...defaultSearchConfig.aggregation,
      maxResultsPerProvider: 20
    }
  },
  pro: defaultSearchConfig // Tutti i provider abilitati
}

// Configurazioni specializzate per tipologie di ricerca
export const searchTypeConfigs = {
  // Configurazione per ricerca di revenge porn / contenuti non consensuali
  revenge_detection: {
    ...defaultSearchConfig,
    providers: {
      ...defaultSearchConfig.providers,
      proprietary: {
        ...defaultSearchConfig.providers.proprietary,
        priority: 15 // Priorità massima
      }
    },
    aggregation: {
      ...defaultSearchConfig.aggregation,
      minimumSimilarity: 70, // Soglia più alta per ridurre falsi positivi
      deduplicationThreshold: 0.90
    }
  },
  
  // Configurazione per copyright infringement
  copyright_detection: {
    ...defaultSearchConfig,
    aggregation: {
      ...defaultSearchConfig.aggregation,
      minimumSimilarity: 80, // Soglia molto alta per copyright
      deduplicationThreshold: 0.95
    }
  },
  
  // Configurazione per ricerca generale
  general_search: {
    ...defaultSearchConfig,
    aggregation: {
      ...defaultSearchConfig.aggregation,
      minimumSimilarity: 75, // Soglia alzata per risultati più precisi
      deduplicationThreshold: 0.85
    }
  }
}

// Configurazioni per diversi livelli di sicurezza
export const securityLevelConfigs = {
  // Scansione veloce (meno provider, timeout più brevi)
  fast: {
    ...defaultSearchConfig,
    providers: {
      proprietary: defaultSearchConfig.providers.proprietary,
      tineye: defaultSearchConfig.providers.tineye // Solo i più veloci
    },
    aggregation: {
      ...defaultSearchConfig.aggregation,
      maxResultsPerProvider: 15,
      timeoutMs: 15000
    }
  },
  
  // Scansione standard
  standard: defaultSearchConfig,
  
  // Scansione approfondita (tutti i provider, timeout lunghi)
  deep: {
    ...defaultSearchConfig,
    aggregation: {
      ...defaultSearchConfig.aggregation,
      maxResultsPerProvider: 50,
      timeoutMs: 60000, // 1 minuto per provider
      minimumSimilarity: 50 // Soglia più bassa per catturare più risultati
    }
  }
}

export function getConfigForUser(
  userPlan: 'free' | 'basic' | 'pro', 
  searchType: keyof typeof searchTypeConfigs = 'general_search',
  securityLevel: keyof typeof securityLevelConfigs = 'standard'
): SearchEngineConfig {
  
  const basePlanConfig = planBasedConfigs[userPlan]
  const typeConfig = searchTypeConfigs[searchType]
  const securityConfig = securityLevelConfigs[securityLevel]
  
  // Merge delle configurazioni con priorità: security > type > plan > default
  return {
    providers: {
      ...basePlanConfig.providers,
      // Applica override per tipo di ricerca
      ...Object.fromEntries(
        Object.entries(typeConfig.providers).filter(([key]) => 
          key in basePlanConfig.providers
        )
      ),
      // Applica override per livello di sicurezza  
      ...Object.fromEntries(
        Object.entries(securityConfig.providers || {}).filter(([key]) => 
          key in basePlanConfig.providers
        )
      )
    },
    aggregation: {
      ...basePlanConfig.aggregation,
      ...typeConfig.aggregation,
      ...securityConfig.aggregation
    }
  }
}