import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    
    if (!user || !(user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Costruisci filtri dinamici
    let whereCondition: any = {}
    
    switch (filter) {
      case 'completed':
        whereCondition.status = 'completed'
        break
      case 'failed':
        whereCondition.status = 'failed'
        break
      case 'recent':
        const last24h = new Date()
        last24h.setHours(last24h.getHours() - 24)
        whereCondition.createdAt = {
          gte: last24h
        }
        break
      // 'all' non aggiunge filtri
    }

    // Recupera i log con informazioni utente
    const logs = await prisma.searchLog.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            email: true,
            plan: true,
            role: true
          }
        },
        search: {
          select: {
            searchType: true,
            status: true,
            resultsCount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Decritta i dati sensibili per l'admin
    const processedLogs = logs.map(log => {
      let decryptedIpAddress = null
      let decryptedUserAgent = null
      
      try {
        if (log.ipAddress) {
          decryptedIpAddress = decryptSensitiveData(log.ipAddress)
        }
        if (log.userAgent) {
          decryptedUserAgent = decryptSensitiveData(log.userAgent)
        }
      } catch (error) {
        console.warn('Could not decrypt sensitive data for log:', log.id)
      }

      return {
        id: log.id,
        searchId: log.searchId,
        userId: log.userId,
        email: log.email || log.user?.email,
        imageStoragePath: log.imageStoragePath,
        imageHash: log.imageHash,
        imageSize: log.imageSize,
        imageMimeType: log.imageMimeType,
        ipAddress: decryptedIpAddress,
        userAgent: decryptedUserAgent,
        geoLocation: log.geoLocation,
        searchType: log.searchType,
        searchQuery: log.searchQuery,
        providersAttempted: log.providersAttempted,
        providersSuccessful: log.providersSuccessful,
        providersFailed: log.providersFailed,
        totalResults: log.totalResults,
        searchTimeMs: log.searchTimeMs,
        processingSteps: log.processingSteps,
        errorLogs: log.errorLogs,
        warnings: log.warnings,
        apiCallsCount: log.apiCallsCount,
        status: log.status,
        createdAt: log.createdAt.toISOString(),
        user: log.user
      }
    })

    // Statistiche aggiuntive
    const stats = {
      total: await prisma.searchLog.count({ where: whereCondition }),
      completed: await prisma.searchLog.count({ 
        where: { ...whereCondition, status: 'completed' } 
      }),
      failed: await prisma.searchLog.count({ 
        where: { ...whereCondition, status: 'failed' } 
      }),
      processing: await prisma.searchLog.count({ 
        where: { ...whereCondition, status: 'processing' } 
      })
    }

    return NextResponse.json({
      logs: processedLogs,
      stats,
      pagination: {
        limit,
        offset,
        total: stats.total,
        hasMore: offset + limit < stats.total
      }
    })

  } catch (error) {
    console.error('Error fetching search logs:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const logId = searchParams.get('id')
    const olderThan = searchParams.get('olderThan') // ISO date string
    
    if (logId) {
      // Elimina un singolo log
      await prisma.searchLog.delete({
        where: { id: logId }
      })
      
      return NextResponse.json({ success: true, message: 'Log eliminato' })
      
    } else if (olderThan) {
      // Elimina log più vecchi di una certa data
      const cutoffDate = new Date(olderThan)
      
      const deletedCount = await prisma.searchLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        message: `${deletedCount.count} log eliminati`,
        deletedCount: deletedCount.count
      })
      
    } else {
      return NextResponse.json(
        { error: 'Parametro id o olderThan richiesto' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error deleting search logs:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}