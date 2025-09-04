import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { defaultSearchConfig } from '@/lib/search/config'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    

    // Get stored configuration
    const configs = await prisma.systemConfig.findMany()
    
    // Build configuration object
    const storedConfig = configs.reduce((acc, config) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, any>)

    // Merge with defaults
    const systemConfig = {
      searchEngine: {
        providers: {
          proprietary: {
            enabled: storedConfig.proprietary_enabled ?? true,
            priority: storedConfig.proprietary_priority ?? 10,
            rateLimit: {
              requestsPerMinute: storedConfig.proprietary_requests_per_minute ?? 100,
              requestsPerDay: storedConfig.proprietary_requests_per_day ?? 10000
            }
          },
          google_vision: {
            enabled: storedConfig.google_vision_enabled ?? !!process.env.GOOGLE_VISION_API_KEY,
            priority: storedConfig.google_vision_priority ?? 8,
            apiKey: showPartialKey(process.env.GOOGLE_VISION_API_KEY),
            rateLimit: {
              requestsPerMinute: storedConfig.google_vision_requests_per_minute ?? 10,
              requestsPerDay: storedConfig.google_vision_requests_per_day ?? 1000
            }
          },
          tineye: {
            enabled: storedConfig.tineye_enabled ?? !!(process.env.TINEYE_API_KEY && process.env.TINEYE_PRIVATE_KEY),
            priority: storedConfig.tineye_priority ?? 9,
            apiKey: showPartialKey(process.env.TINEYE_API_KEY),
            rateLimit: {
              requestsPerMinute: storedConfig.tineye_requests_per_minute ?? 5,
              requestsPerDay: storedConfig.tineye_requests_per_day ?? 150
            }
          },
          yandex: {
            enabled: storedConfig.yandex_enabled ?? !!process.env.YANDEX_API_KEY,
            priority: storedConfig.yandex_priority ?? 6,
            apiKey: showPartialKey(process.env.YANDEX_API_KEY),
            rateLimit: {
              requestsPerMinute: storedConfig.yandex_requests_per_minute ?? 10,
              requestsPerDay: storedConfig.yandex_requests_per_day ?? 1000
            }
          },
          bing_visual: {
            enabled: storedConfig.bing_visual_enabled ?? !!process.env.BING_SEARCH_API_KEY,
            priority: storedConfig.bing_visual_priority ?? 5,
            apiKey: showPartialKey(process.env.BING_SEARCH_API_KEY),
            rateLimit: {
              requestsPerMinute: storedConfig.bing_visual_requests_per_minute ?? 20,
              requestsPerDay: storedConfig.bing_visual_requests_per_day ?? 3000
            }
          }
        },
        aggregation: {
          deduplicationThreshold: storedConfig.deduplication_threshold ?? defaultSearchConfig.aggregation.deduplicationThreshold,
          minimumSimilarity: storedConfig.minimum_similarity ?? defaultSearchConfig.aggregation.minimumSimilarity,
          maxResultsPerProvider: storedConfig.max_results_per_provider ?? defaultSearchConfig.aggregation.maxResultsPerProvider,
          timeoutMs: storedConfig.timeout_ms ?? defaultSearchConfig.aggregation.timeoutMs
        }
      },
      system: {
        maintenance: storedConfig.maintenance_mode ?? false,
        debugMode: storedConfig.debug_mode ?? false,
        logLevel: storedConfig.log_level ?? 'info',
        maxConcurrentSearches: storedConfig.max_concurrent_searches ?? 10
      },
      plans: {
        free: {
          maxSearches: storedConfig.free_max_searches ?? 1,
          price: 0,
          features: JSON.parse(storedConfig.free_features ?? '["1 ricerca gratuita", "Scansione di base", "Privacy garantita"]')
        },
        basic: {
          maxSearches: storedConfig.basic_max_searches ?? 10,
          price: storedConfig.basic_price ?? 9.99,
          features: JSON.parse(storedConfig.basic_features ?? '["10 ricerche al mese", "Scansione avanzata", "Report dettagliati", "Supporto prioritario"]')
        },
        pro: {
          maxSearches: storedConfig.pro_max_searches ?? 999,
          price: storedConfig.pro_price ?? 19.99,
          features: JSON.parse(storedConfig.pro_features ?? '["Ricerche illimitate", "Monitoraggio continuo", "API access", "Assistenza dedicata"]')
        }
      }
    }

    return NextResponse.json(systemConfig)

  } catch (error) {
    console.error('Error fetching system config:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminUser = await requireAdmin()

    const config = await request.json()

    // Log admin action
    await prisma.activityLog.create({
      data: {
        adminId: adminUser.id,
        action: 'SYSTEM_CONFIG_UPDATE',
        resource: 'system_config',
        details: { updatedBy: adminUser.email },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Convert config object to flat key-value pairs for storage
    const configEntries = [
      // Provider settings
      ...Object.entries(config.searchEngine.providers).flatMap(([provider, settings]: [string, any]) => [
        { key: `${provider}_enabled`, value: settings.enabled },
        { key: `${provider}_priority`, value: settings.priority },
        ...(settings.rateLimit ? [
          { key: `${provider}_requests_per_minute`, value: settings.rateLimit.requestsPerMinute },
          { key: `${provider}_requests_per_day`, value: settings.rateLimit.requestsPerDay }
        ] : [])
      ]),
      
      // Aggregation settings
      { key: 'deduplication_threshold', value: config.searchEngine.aggregation.deduplicationThreshold },
      { key: 'minimum_similarity', value: config.searchEngine.aggregation.minimumSimilarity },
      { key: 'max_results_per_provider', value: config.searchEngine.aggregation.maxResultsPerProvider },
      { key: 'timeout_ms', value: config.searchEngine.aggregation.timeoutMs },
      
      // System settings
      { key: 'maintenance_mode', value: config.system.maintenance },
      { key: 'debug_mode', value: config.system.debugMode },
      { key: 'log_level', value: config.system.logLevel },
      { key: 'max_concurrent_searches', value: config.system.maxConcurrentSearches },
      
      // Plan settings
      ...Object.entries(config.plans).flatMap(([plan, settings]: [string, any]) => [
        { key: `${plan}_max_searches`, value: settings.maxSearches },
        { key: `${plan}_price`, value: settings.price },
        { key: `${plan}_features`, value: JSON.stringify(settings.features) }
      ])
    ]

    // Update configuration in database
    for (const entry of configEntries) {
      await prisma.systemConfig.upsert({
        where: { key: entry.key },
        update: { 
          value: entry.value,
          updatedBy: adminUser.id
        },
        create: {
          key: entry.key,
          value: entry.value,
          category: getCategoryForKey(entry.key),
          updatedBy: adminUser.id
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Configurazione aggiornata con successo'
    })

  } catch (error) {
    console.error('Error updating system config:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della configurazione' },
      { status: 500 }
    )
  }
}

function showPartialKey(apiKey: string | undefined): string | undefined {
  if (!apiKey) return undefined
  if (apiKey.length <= 8) return apiKey
  return apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4)
}

function getCategoryForKey(key: string): string {
  if (key.includes('_enabled') || key.includes('_priority') || key.includes('_requests_')) {
    return 'providers'
  }
  if (key.includes('deduplication') || key.includes('similarity') || key.includes('timeout')) {
    return 'aggregation'
  }
  if (key.includes('maintenance') || key.includes('debug') || key.includes('log') || key.includes('concurrent')) {
    return 'system'
  }
  if (key.includes('_max_searches') || key.includes('_price') || key.includes('_features')) {
    return 'plans'
  }
  return 'general'
}