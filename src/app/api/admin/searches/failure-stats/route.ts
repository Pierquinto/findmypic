import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Statistiche base per fallimenti
    const [
      totalFailed,
      todayFailed,
      totalSearches,
      failedSearchesWithDetails,
      providerFailures
    ] = await Promise.all([
      // Conta ricerche fallite
      prisma.search.count({
        where: {
          status: 'failed'
        }
      }),
      
      // Fallimenti oggi
      prisma.search.count({
        where: {
          status: 'failed',
          createdAt: {
            gte: today
          }
        }
      }),

      // Totale ricerche per calcolare il tasso di fallimento
      prisma.search.count(),

      // Ricerche fallite con dettagli per analisi
      prisma.search.findMany({
        where: {
          status: 'failed'
        },
        select: {
          id: true,
          encryptedResults: true,
          searchTime: true,
          providersUsed: true,
          searchType: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),

      // Provider che hanno causato fallimenti
      prisma.search.findMany({
        where: {
          status: 'failed',
          providersUsed: {
            not: null
          }
        },
        select: {
          providersUsed: true
        }
      })
    ])

    // Analizza le cause dei fallimenti
    const failureReasons: Record<string, number> = {}
    const providerProblems: Record<string, number> = {}
    let totalFailureTime = 0
    let failuresWithTime = 0

    failedSearchesWithDetails.forEach(search => {
      // Analizza il motivo del fallimento
      let reason = 'Motivo sconosciuto'
      
      if (search.encryptedResults && typeof search.encryptedResults === 'string') {
        try {
          const results = JSON.parse(search.encryptedResults) as any
        
        if (results.error) {
          if (typeof results.error === 'string') {
            const error = results.error.toLowerCase()
            if (error.includes('timeout') || error.includes('tempo')) {
              reason = 'Timeout ricerca'
            } else if (error.includes('network') || error.includes('connessione') || error.includes('connection')) {
              reason = 'Errori di rete'
            } else if (error.includes('api') || error.includes('provider')) {
              reason = 'Problemi provider'
            } else if (error.includes('quota') || error.includes('limit')) {
              reason = 'Limite API raggiunto'
            } else if (error.includes('auth') || error.includes('key')) {
              reason = 'Errore autenticazione'
            } else if (error.includes('database') || error.includes('storage')) {
              reason = 'Errori database'
            } else {
              reason = 'Errore sistema'
            }
          }
        } else if (!search.providersUsed || Object.keys(search.providersUsed).length === 0) {
          reason = 'Nessun provider disponibile'
        } else if (search.searchTime && search.searchTime > 30000) {
          reason = 'Timeout ricerca'
        }
        } catch (error) {
          // Se non riusciamo a parsare encryptedResults, usa fallback
          if (!search.providersUsed || Object.keys(search.providersUsed).length === 0) {
            reason = 'Nessun provider disponibile'
          } else if (search.searchTime && search.searchTime > 30000) {
            reason = 'Timeout ricerca'
          }
        }
      } else {
        // Fallback se non ci sono encryptedResults
        if (!search.providersUsed || Object.keys(search.providersUsed).length === 0) {
          reason = 'Nessun provider disponibile'
        } else if (search.searchTime && search.searchTime > 30000) {
          reason = 'Timeout ricerca'
        }
      }

      failureReasons[reason] = (failureReasons[reason] || 0) + 1

      // Calcola tempo medio fallimento
      if (search.searchTime) {
        totalFailureTime += search.searchTime
        failuresWithTime++
      }
    })

    // Analizza provider problematici
    providerFailures.forEach(search => {
      if (search.providersUsed) {
        const providers = search.providersUsed as Record<string, any>
        Object.keys(providers).forEach(provider => {
          providerProblems[provider] = (providerProblems[provider] || 0) + 1
        })
      }
    })

    // Trova i top failure reasons
    const topFailureReasons = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Trova il provider più problematico
    const mostProblematicProvider = Object.keys(providerProblems).length > 0
      ? Object.entries(providerProblems).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null

    // Calcola statistiche temporali
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    const dailyFailures = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date)
        nextDay.setDate(date.getDate() + 1)
        
        const count = await prisma.search.count({
          where: {
            status: 'failed',
            createdAt: {
              gte: date,
              lt: nextDay
            }
          }
        })

        return {
          date: date.toISOString().split('T')[0],
          failures: count
        }
      })
    )

    const stats = {
      totalFailed,
      todayFailed,
      failureRate: totalSearches > 0 ? (totalFailed / totalSearches) * 100 : 0,
      avgFailureTime: failuresWithTime > 0 ? Math.round(totalFailureTime / failuresWithTime) : 0,
      topFailureReasons,
      mostProblematicProvider,
      providerFailureStats: Object.entries(providerProblems)
        .map(([provider, count]) => ({ provider, failures: count }))
        .sort((a, b) => b.failures - a.failures),
      dailyFailures,
      failuresByType: await prisma.search.groupBy({
        by: ['searchType'],
        where: {
          status: 'failed'
        },
        _count: {
          searchType: true
        }
      }),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching failure stats:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}