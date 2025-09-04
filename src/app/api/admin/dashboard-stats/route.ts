import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check admin privileges
    await requireAdmin()

    // Get dashboard statistics
    const [
      totalUsers,
      totalSearches,
      totalViolations,
      recentUsers,
      recentSearches
    ] = await Promise.all([
      prisma.user.count(),
      prisma.search.count(),
      prisma.violation.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          createdAt: true,
          plan: true
        }
      }),
      prisma.search.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              email: true
            }
          }
        }
      })
    ])

    const stats = {
      users: {
        total: totalUsers,
        new: 0, // TODO: Calculate new users
        active: 0, // TODO: Calculate active users
        growth: 0, // TODO: Calculate growth
        plans: { free: totalUsers, basic: 0, pro: 0 } // TODO: Calculate plan distribution
      },
      searches: {
        total: totalSearches,
        today: 0, // TODO: Calculate today's searches
        thisWeek: 0, // TODO: Calculate this week's searches
        avgPerUser: totalUsers > 0 ? Math.round(totalSearches / totalUsers) : 0,
        successRate: 95, // Mock success rate
        avgResponseTime: 1200 // Mock average response time in ms
      },
      revenue: {
        monthly: 0, // TODO: Calculate monthly revenue
        total: 0, // TODO: Calculate total revenue
        growth: 0, // TODO: Calculate revenue growth
        mrr: 0, // TODO: Calculate MRR
        churnRate: 5, // Mock churn rate
        arpu: 0 // TODO: Calculate ARPU
      },
      system: {
        uptime: "99.9%", // Mock uptime
        providers: 3, // Number of search providers
        errors: 0, // Mock error count
        cpu: 45, // Mock CPU usage percentage
        memory: 68, // Mock memory usage percentage
        storage: 32, // Mock storage usage percentage
        activeConnections: 127 // Mock active connections
      },
      violations: {
        total: totalViolations,
        resolved: 0, // TODO: Calculate resolved violations
        pending: 0, // TODO: Calculate pending violations
        critical: 0 // TODO: Calculate critical violations
      },
      recentUsers,
      recentSearches
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}