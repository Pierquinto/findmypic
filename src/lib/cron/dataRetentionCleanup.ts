import { prisma } from '@/lib/prisma'

/**
 * Script di pulizia automatica per conformità GDPR
 * Rimuove i dati di ricerca dopo 6 mesi per utenti free
 * Mantiene i dati per utenti premium fino a richiesta di rimozione
 */

export async function performDataRetentionCleanup() {
  const now = new Date()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(now.getMonth() - 6)

  console.log(`Starting data retention cleanup for searches older than ${sixMonthsAgo.toISOString()}`)

  try {
    // 1. Trova utenti free con ricerche da rimuovere
    const freeUsersWithOldSearches = await prisma.user.findMany({
      where: {
        plan: 'free',
        Search: {
          some: {
            createdAt: {
              lt: sixMonthsAgo
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        Search: {
          where: {
            createdAt: {
              lt: sixMonthsAgo
            }
          },
          select: {
            id: true,
            createdAt: true
          }
        }
      }
    })

    let totalDeleted = 0
    const userCleanupResults = []

    // 2. Rimuovi ricerche per ogni utente free
    for (const user of freeUsersWithOldSearches) {
      const searchIds = user.Search.map(s => s.id)
      
      const deleteResult = await prisma.search.deleteMany({
        where: {
          userId: user.id,
          id: { in: searchIds }
        }
      })

      totalDeleted += deleteResult.count
      userCleanupResults.push({
        userId: user.id,
        email: user.email,
        deletedSearches: deleteResult.count,
        oldestDeleted: user.Search.reduce((oldest, search) => 
          search.createdAt < oldest ? search.createdAt : oldest, new Date()
        )
      })

      // Log dell'attività per ogni utente
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'AUTOMATIC_DATA_RETENTION_CLEANUP',
          resource: 'search',
          details: {
            deletedSearches: deleteResult.count,
            reason: 'data_retention_policy_6_months',
            cutoffDate: sixMonthsAgo.toISOString(),
            cleanupDate: now.toISOString()
          },
          ipAddress: 'system_cron'
        }
      })
    }

    // 3. Pulisci anche richieste personalizzate vecchie (dopo 12 mesi)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(now.getMonth() - 12)

    const oldCustomRequests = await prisma.customSearchRequest.deleteMany({
      where: {
        createdAt: {
          lt: twelveMonthsAgo
        },
        status: {
          in: ['completed', 'cancelled']
        }
      }
    })

    // 4. Pulisci log di attività molto vecchi (dopo 24 mesi)
    const twentyFourMonthsAgo = new Date()
    twentyFourMonthsAgo.setMonth(now.getMonth() - 24)

    const oldActivityLogs = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: twentyFourMonthsAgo
        }
      }
    })

    // 5. Log del risultato della pulizia generale
    await prisma.activityLog.create({
      data: {
        action: 'SYSTEM_DATA_RETENTION_CLEANUP',
        resource: 'system',
        details: {
          totalSearchesDeleted: totalDeleted,
          affectedUsers: freeUsersWithOldSearches.length,
          customRequestsDeleted: oldCustomRequests.count,
          activityLogsDeleted: oldActivityLogs.count,
          cleanupDate: now.toISOString(),
          retentionPeriods: {
            searches_free_users: '6_months',
            custom_requests: '12_months', 
            activity_logs: '24_months'
          }
        },
        ipAddress: 'system_cron'
      }
    })

    const summary = {
      success: true,
      cleanupDate: now.toISOString(),
      results: {
        searchesDeleted: totalDeleted,
        affectedFreeUsers: freeUsersWithOldSearches.length,
        customRequestsDeleted: oldCustomRequests.count,
        activityLogsDeleted: oldActivityLogs.count
      },
      userBreakdown: userCleanupResults,
      nextCleanup: 'Next cleanup will run in 24 hours'
    }

    console.log('Data retention cleanup completed:', summary)
    return summary

  } catch (error) {
    console.error('Data retention cleanup failed:', error)
    
    // Log dell'errore
    await prisma.activityLog.create({
      data: {
        action: 'SYSTEM_DATA_RETENTION_CLEANUP_FAILED',
        resource: 'system',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          cleanupDate: now.toISOString()
        },
        ipAddress: 'system_cron'
      }
    })

    throw error
  }
}

/**
 * Ottieni statistiche sulla pulizia programmata
 */
export async function getDataRetentionStats() {
  const now = new Date()
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(now.getMonth() - 6)

  const [
    freeUserSearchesForDeletion,
    premiumUserTotalSearches,
    oldCustomRequests,
    oldActivityLogs
  ] = await Promise.all([
    // Ricerche di utenti free da cancellare
    prisma.search.count({
      where: {
        createdAt: { lt: sixMonthsAgo },
        user: { plan: 'free' }
      }
    }),
    
    // Ricerche totali di utenti premium (non cancellate automaticamente)
    prisma.search.count({
      where: {
        user: { 
          plan: { in: ['basic', 'pro'] }
        }
      }
    }),

    // Richieste personalizzate da cancellare (>12 mesi)
    prisma.customSearchRequest.count({
      where: {
        createdAt: { lt: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000) },
        status: { in: ['completed', 'cancelled'] }
      }
    }),

    // Log di attività da cancellare (>24 mesi)
    prisma.activityLog.count({
      where: {
        createdAt: { lt: new Date(now.getTime() - 24 * 30 * 24 * 60 * 60 * 1000) }
      }
    })
  ])

  return {
    scheduledForDeletion: {
      freeUserSearches: freeUserSearchesForDeletion,
      customRequests: oldCustomRequests,
      activityLogs: oldActivityLogs
    },
    retained: {
      premiumUserSearches: premiumUserTotalSearches
    },
    policy: {
      freeUsers: '6 months automatic deletion',
      premiumUsers: 'User controlled deletion',
      customRequests: '12 months after completion',
      activityLogs: '24 months retention'
    },
    nextCleanup: 'Daily at 02:00 UTC'
  }
}