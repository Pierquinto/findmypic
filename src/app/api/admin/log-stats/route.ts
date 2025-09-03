import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    // Statistiche di base dai log di ricerca
    const [
      totalLogs,
      completedLogs,
      failedLogs,
      processingLogs,
      avgSearchTime,
      totalApiCalls
    ] = await Promise.all([
      prisma.searchLog.count(),
      prisma.searchLog.count({ where: { status: 'completed' } }),
      prisma.searchLog.count({ where: { status: 'failed' } }),
      prisma.searchLog.count({ where: { status: 'processing' } }),
      prisma.searchLog.aggregate({
        _avg: { searchTimeMs: true },
        where: { searchTimeMs: { not: null } }
      }),
      prisma.searchLog.aggregate({
        _sum: { apiCallsCount: true }
      })
    ])

    return NextResponse.json({
      total: totalLogs,
      completed: completedLogs,
      failed: failedLogs,
      processing: processingLogs,
      avgSearchTime: Math.round(avgSearchTime._avg.searchTimeMs || 0),
      totalApiCalls: totalApiCalls._sum.apiCallsCount || 0,
      successRate: totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0
    })

  } catch (error) {
    console.error('Error fetching log stats:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}