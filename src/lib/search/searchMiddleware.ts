import { encryptSensitiveData, createDataHash } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

export interface SearchRequest {
  userId: string
  imageFile?: File | string
  imageUrl?: string
  searchType?: string
  ipAddress?: string
  userAgent?: string
}

export interface SearchResult {
  id: string
  results: any[]
  providersUsed: Record<string, any>
  searchTime: number
  status: 'completed' | 'failed' | 'processing'
}

/**
 * Middleware per crittografare e salvare i dati della ricerca
 */
export async function saveEncryptedSearch(
  searchRequest: SearchRequest,
  searchResult: SearchResult,
  publicResults?: any
): Promise<string> {
  try {
    // Crittografa i dati sensibili - converte array in string JSON prima
    const encryptedResults = encryptSensitiveData(JSON.stringify(searchResult.results))
    const encryptedImagePath = searchRequest.imageUrl ? 
      encryptSensitiveData(searchRequest.imageUrl) : null
    const encryptedIpAddress = searchRequest.ipAddress ? 
      encryptSensitiveData(searchRequest.ipAddress) : null
    const encryptedUserAgent = searchRequest.userAgent ? 
      encryptSensitiveData(searchRequest.userAgent) : null

    // Genera hash dell'immagine per identificazione
    const imageHash = searchRequest.imageUrl ? 
      createDataHash(searchRequest.imageUrl) : null

    // Salva nel database con transazione per garantire consistenza
    const savedSearch = await prisma.$transaction(async (tx) => {
      // Crea la ricerca principale
      const search = await tx.search.create({
        data: {
          id: searchResult.id,
          userId: searchRequest.userId,
          imageUrl: searchRequest.imageUrl,
          encryptedImagePath: encryptedImagePath,
          encryptedResults: encryptedResults,
          searchType: searchRequest.searchType || 'general_search',
          providersUsed: searchResult.providersUsed,
          searchTime: searchResult.searchTime,
          resultsCount: searchResult.results.length,
          ipAddress: encryptedIpAddress,
          userAgent: encryptedUserAgent,
          imageHash: imageHash,
          status: searchResult.status
        }
      })

      // Salva i risultati nella tabella separata
      if (searchResult.results.length > 0) {
        await tx.searchResult.createMany({
          data: searchResult.results.map(result => ({
            searchId: search.id,
            url: result.url,
            siteName: result.siteName,
            title: result.title || result.siteName,
            similarity: parseFloat(result.similarity.toString()),
            status: result.status,
            thumbnail: result.thumbnail,
            provider: result.provider,
            metadata: result.metadata || {},
            detectedAt: result.detectedAt ? new Date(result.detectedAt) : new Date()
          }))
        })
      }

      return search
    })

    // Log dell'attività
    await prisma.activityLog.create({
      data: {
        userId: searchRequest.userId,
        action: 'SEARCH_PERFORMED',
        resource: 'search',
        resourceId: savedSearch.id,
        details: {
          searchType: searchRequest.searchType,
          resultsCount: searchResult.results.length,
          providers: Object.keys(searchResult.providersUsed),
          searchTime: searchResult.searchTime,
          hasImage: !!searchRequest.imageUrl,
          status: searchResult.status
        },
        ipAddress: encryptedIpAddress
      }
    })

    return savedSearch.id

  } catch (error) {
    console.error('Error saving encrypted search:', error)
    
    // In caso di errore, prova a salvare almeno i dati di base
    try {
      const fallbackSearch = await prisma.search.create({
        data: {
          id: searchResult.id,
          userId: searchRequest.userId,
          results: { error: 'Errore nel salvare i dati completi' },
          searchType: searchRequest.searchType || 'general_search',
          providersUsed: searchResult.providersUsed,
          searchTime: searchResult.searchTime,
          resultsCount: 0,
          status: 'failed'
        }
      })
      return fallbackSearch.id
    } catch (fallbackError) {
      console.error('Error saving fallback search:', fallbackError)
      throw new Error('Impossibile salvare la ricerca')
    }
  }
}

/**
 * Aggiorna lo status di una ricerca esistente
 */
export async function updateSearchStatus(
  searchId: string,
  status: 'completed' | 'failed' | 'processing',
  additionalData?: Partial<{
    results: any[]
    searchTime: number
    providersUsed: Record<string, any>
    error: string
  }>
): Promise<void> {
  try {
    const updateData: any = { status }

    if (additionalData?.results) {
      const encryptedResults = encryptSensitiveData(JSON.stringify(additionalData.results))
      updateData.encryptedResults = encryptedResults
      updateData.resultsCount = additionalData.results.length
    }

    if (additionalData?.searchTime) {
      updateData.searchTime = additionalData.searchTime
    }

    if (additionalData?.providersUsed) {
      updateData.providersUsed = additionalData.providersUsed
    }

    if (additionalData?.error) {
      updateData.results = {
        ...updateData.results,
        error: additionalData.error
      }
    }

    await prisma.search.update({
      where: { id: searchId },
      data: updateData
    })

  } catch (error) {
    console.error('Error updating search status:', error)
    throw error
  }
}

/**
 * Pulisce i dati delle ricerche più vecchie (per GDPR compliance)
 */
export async function cleanupOldSearches(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.search.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        // Mantieni le ricerche con problemi per debug
        status: {
          not: 'failed'
        }
      }
    })

    // Log dell'operazione di pulizia
    await prisma.activityLog.create({
      data: {
        action: 'CLEANUP_OLD_SEARCHES',
        resource: 'system',
        details: {
          deletedCount: result.count,
          cutoffDate: cutoffDate.toISOString(),
          daysOld
        }
      }
    })

    return result.count

  } catch (error) {
    console.error('Error cleaning up old searches:', error)
    throw error
  }
}

/**
 * Ottieni statistiche aggregate per l'admin
 */
export async function getSearchStatistics(timeRange: 'day' | 'week' | 'month' = 'day') {
  try {
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
    }

    const [totalSearches, successfulSearches, failedSearches, avgTime] = await Promise.all([
      prisma.search.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),
      prisma.search.count({
        where: {
          status: 'completed',
          createdAt: {
            gte: startDate
          }
        }
      }),
      prisma.search.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: startDate
          }
        }
      }),
      prisma.search.aggregate({
        _avg: {
          searchTime: true
        },
        where: {
          searchTime: {
            not: null
          },
          createdAt: {
            gte: startDate
          }
        }
      })
    ])

    return {
      timeRange,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      },
      totalSearches,
      successfulSearches,
      failedSearches,
      successRate: totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0,
      avgSearchTime: Math.round(avgTime._avg.searchTime || 0)
    }

  } catch (error) {
    console.error('Error getting search statistics:', error)
    throw error
  }
}