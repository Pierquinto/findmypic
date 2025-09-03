import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Statistiche base per immagini
    const [
      totalImages,
      todayImages,
      searchesWithResults,
      formatStats
    ] = await Promise.all([
      // Conta ricerche con immagini
      prisma.search.count({
        where: {
          OR: [
            { imageUrl: { not: null } },
            { encryptedImagePath: { not: null } }
          ]
        }
      }),
      
      // Immagini caricate oggi
      prisma.search.count({
        where: {
          OR: [
            { imageUrl: { not: null } },
            { encryptedImagePath: { not: null } }
          ],
          createdAt: {
            gte: today
          }
        }
      }),

      // Ricerche con immagini che hanno prodotto risultati
      prisma.search.findMany({
        where: {
          OR: [
            { imageUrl: { not: null } },
            { encryptedImagePath: { not: null } }
          ],
          resultsCount: {
            gt: 0
          }
        },
        select: {
          resultsCount: true,
          searchTime: true
        }
      }),

      // Statistiche sui tipi/formati (simulata dato che non abbiamo metadati file)
      prisma.search.groupBy({
        by: ['searchType'],
        where: {
          OR: [
            { imageUrl: { not: null } },
            { encryptedImagePath: { not: null } }
          ]
        },
        _count: {
          searchType: true
        }
      })
    ])

    // Calcola statistiche aggregate
    const averageResults = searchesWithResults.length > 0 
      ? searchesWithResults.reduce((sum, s) => sum + s.resultsCount, 0) / searchesWithResults.length 
      : 0

    const averageSearchTime = searchesWithResults.length > 0 
      ? searchesWithResults.reduce((sum, s) => sum + (s.searchTime || 0), 0) / searchesWithResults.length 
      : 0

    // Simula statistiche di storage (in produzione andrebbero calcolate dai file reali)
    const estimatedAverageFileSize = 250 * 1024 // 250KB stimato per immagine
    const estimatedStorageUsed = totalImages * estimatedAverageFileSize

    // Trova il formato più usato (basato sui tipi di ricerca)
    const mostUsedSearchType = formatStats.reduce((prev, current) => 
      prev._count.searchType > current._count.searchType ? prev : current, 
      formatStats[0]
    )

    const stats = {
      totalImages,
      todayImages,
      averageFileSize: estimatedAverageFileSize,
      mostUsedFormat: mostUsedSearchType?.searchType === 'reverse_image' ? 'JPG' : 'PNG', // Simulato
      storageUsed: estimatedStorageUsed,
      averageResults: Math.round(averageResults),
      averageSearchTime: Math.round(averageSearchTime),
      formatDistribution: formatStats.map(stat => ({
        format: stat.searchType,
        count: stat._count.searchType,
        percentage: (stat._count.searchType / totalImages) * 100
      })),
      successRate: totalImages > 0 ? (searchesWithResults.length / totalImages) * 100 : 0,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching image stats:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}