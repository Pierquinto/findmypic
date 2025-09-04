import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const plan = searchParams.get('plan') || 'all'
    const status = searchParams.get('status') || 'all'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (search) {
      whereClause.email = {
        contains: search,
        mode: 'insensitive'
      }
    }
    
    if (plan !== 'all') {
      whereClause.plan = plan
    }
    
    if (status !== 'all') {
      whereClause.isActive = status === 'active'
    }

    // Fetch users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              Search: true,
              Subscription: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc'
        },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where: whereClause })
    ])

    // Remove sensitive data
    const sanitizedUsers = users.map(user => ({
      ...user,
      password: undefined
    }))

    return NextResponse.json({
      users: sanitizedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireAdmin()

    const { action, userIds, data } = await request.json()

    // Log admin action
    await prisma.activityLog.create({
      data: {
        adminId: adminUser.id,
        action: `BULK_USER_${action.toUpperCase()}`,
        resource: 'users',
        details: { userIds, data },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    switch (action) {
      case 'bulk_activate':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true }
        })
        break

      case 'bulk_deactivate':
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        })
        break

      case 'bulk_delete':
        // Soft delete by marking as inactive and adding deleted flag
        await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: false }
        })
        break

      case 'bulk_upgrade':
        if (data.plan) {
          await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: { plan: data.plan }
          })
        }
        break

      default:
        return NextResponse.json(
          { error: 'Azione non supportata' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Azione ${action} completata per ${userIds.length} utenti`
    })

  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'operazione' },
      { status: 500 }
    )
  }
}