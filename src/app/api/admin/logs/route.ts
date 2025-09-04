import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const level = searchParams.get('level')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    const offset = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (action && action !== 'all') {
      whereClause.action = action
    }
    
    if (resource && resource !== 'all') {
      whereClause.resource = resource
    }
    
    if (level && level !== 'all') {
      if (level === 'error') {
        whereClause.action = { contains: 'ERROR' }
      } else if (level === 'warning') {
        whereClause.action = { contains: 'WARNING' }
      } else if (level === 'info') {
        whereClause.action = { contains: 'INFO' }
      }
    }
    
    if (userId) {
      whereClause.userId = userId
    }
    
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = endDate
      }
    }
    
    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { details: { path: ['$'], string_contains: search } }
      ]
    }

    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.activityLog.count({ where: whereClause })
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}