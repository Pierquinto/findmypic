import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Solo utenti premium possono richiedere rimozione immediata
    if (user.plan === 'free') {
      return NextResponse.json(
        { 
          error: 'Funzionalità non disponibile',
          message: 'Gli utenti free hanno rimozione automatica dopo 6 mesi. Aggiorna a un piano premium per il controllo manuale.'
        },
        { status: 403 }
      )
    }

    const { searchIds, removeAll } = await req.json()

    let deletedCount = 0

    if (removeAll) {
      // Rimuovi tutte le ricerche dell'utente
      const result = await prisma.search.deleteMany({
        where: { userId }
      })
      deletedCount = result.count
    } else if (searchIds && Array.isArray(searchIds)) {
      // Rimuovi ricerche specifiche
      const result = await prisma.search.deleteMany({
        where: {
          userId,
          id: { in: searchIds }
        }
      })
      deletedCount = result.count
    } else {
      return NextResponse.json(
        { error: 'Parametri non validi' },
        { status: 400 }
      )
    }

    // Log dell'attività
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'USER_DATA_REMOVAL',
        resource: 'search',
        details: {
          deletedSearches: deletedCount,
          removeAll: !!removeAll,
          specificIds: searchIds || [],
          timestamp: new Date().toISOString()
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: `${deletedCount} ricerche rimosse con successo`,
      deletedCount,
      dataRetentionInfo: {
        policy: 'user_controlled',
        automaticCleanup: 'disabled_for_premium_users',
        nextScheduledCleanup: null
      }
    })

  } catch (error) {
    console.error('Error removing user data:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Ottieni informazioni sulle ricerche dell'utente
    const [totalSearches, oldestSearch, searchesByMonth] = await Promise.all([
      prisma.search.count({
        where: { userId }
      }),
      prisma.search.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      }),
      prisma.search.groupBy({
        by: ['createdAt'],
        where: { 
          userId,
          createdAt: {
            gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // Ultimi 6 mesi
          }
        },
        _count: { id: true }
      })
    ])

    // Calcola quando scadranno i dati per utenti free
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const searchesForDeletion = user.plan === 'free' ? await prisma.search.count({
      where: {
        userId,
        createdAt: {
          lt: sixMonthsAgo
        }
      }
    }) : 0

    return NextResponse.json({
      user: {
        id: userId,
        plan: user.plan,
        canManuallyDelete: user.plan !== 'free'
      },
      dataInfo: {
        totalSearches,
        oldestSearchDate: oldestSearch?.createdAt,
        searchesScheduledForDeletion: searchesForDeletion,
        dataRetentionPolicy: {
          free: '6_months_automatic',
          premium: 'user_controlled'
        },
        currentPolicy: user.plan === 'free' ? '6_months_automatic' : 'user_controlled'
      },
      actions: {
        canRequestImmediate: user.plan !== 'free',
        canViewData: true,
        canExportData: true // Feature per il futuro
      }
    })

  } catch (error) {
    console.error('Error getting user data info:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}