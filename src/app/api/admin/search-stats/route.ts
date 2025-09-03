import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'
import { SearchEngineFactory } from '@/lib/search/SearchEngineFactory'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    // Statistiche dalle ricerche nel database
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalSearches,
      todaySearches,
      successfulSearches,
      failedSearches,
      avgSearchTime,
      providerStats,
      searchTypeStats
    ] = await Promise.all([
      prisma.search.count(),
      prisma.search.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.search.count({
        where: {
          status: 'completed'
        }
      }),
      prisma.search.count({
        where: {
          status: 'failed'
        }
      }),
      prisma.search.aggregate({
        _avg: {
          searchTime: true
        },
        where: {
          searchTime: {
            not: null
          }
        }
      }),
      // Statistiche provider dai risultati
      prisma.search.findMany({
        where: {
          providersUsed: {
            not: null
          }
        },
        select: {
          providersUsed: true
        }
      }),
      // Statistiche tipi di ricerca
      prisma.search.groupBy({
        by: ['searchType'],
        _count: {
          searchType: true
        }
      })
    ])

    // Processa statistiche provider
    const providerCounts: Record<string, number> = {}
    providerStats.forEach(search => {
      if (search.providersUsed) {
        const providers = search.providersUsed as Record<string, any>
        Object.keys(providers).forEach(provider => {
          providerCounts[provider] = (providerCounts[provider] || 0) + 1
        })
      }
    })

    const topProviders = Object.entries(providerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const topSearchTypes = searchTypeStats.map(stat => ({
      type: stat.searchType,
      count: stat._count.searchType
    }))

    // Ottieni anche statistiche del sistema di ricerca
    let systemStats = null
    try {
      const globalStats = await SearchEngineFactory.getGlobalProviderStats()
      const systemValidation = SearchEngineFactory.validateSystemConfiguration()
      
      systemStats = {
        providers: globalStats.providers,
        cache: {
          size: globalStats.cacheSize,
          availableProviders: globalStats.availableProviders
        },
        system: {
          isValid: systemValidation.isValid,
          warnings: systemValidation.warnings,
          errors: systemValidation.errors
        },
        configuration: {
          hasGoogleVision: !!process.env.GOOGLE_VISION_API_KEY,
          hasTinEye: !!(process.env.TINEYE_API_KEY && process.env.TINEYE_PRIVATE_KEY),
          hasYandex: !!process.env.YANDEX_API_KEY,
          hasBing: !!process.env.BING_SEARCH_API_KEY
        }
      }
    } catch (error) {
      console.error('Error fetching system search stats:', error)
    }

    const stats = {
      totalSearches,
      todaySearches,
      successfulSearches,
      failedSearches,
      avgSearchTime: Math.round(avgSearchTime._avg.searchTime || 0),
      topProviders,
      topSearchTypes,
      systemStats,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching search stats:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Endpoint per pulire la cache
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Accesso negato' },
        { status: 403 }
      )
    }

    SearchEngineFactory.clearCache()

    return NextResponse.json({ 
      success: true, 
      message: 'Cache pulita con successo',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Errore durante la pulizia della cache' },
      { status: 500 }
    )
  }
}