import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'

    // Calculate time periods
    const now = new Date()
    const days = parseInt(timeRange.replace('d', ''))
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

    // Users Analytics
    const totalUsers = await prisma.user.count()
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: startDate } }
    })
    const previousNewUsers = await prisma.user.count({
      where: { 
        createdAt: { 
          gte: previousStartDate,
          lt: startDate 
        } 
      }
    })

    const userGrowthRate = previousNewUsers > 0 ? (newUsers - previousNewUsers) / previousNewUsers : 0

    // Active users (users who made at least one search in the period)
    const activeUsers = await prisma.user.count({
      where: {
        Search: {
          some: {
            createdAt: { gte: startDate }
          }
        }
      }
    })

    // Daily user registrations for the period
    const dailyUsers = []
    const dailyActiveUsers = []
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

      const dayUsers = await prisma.user.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      })

      const dayActiveUsers = await prisma.user.count({
        where: {
          Search: {
            some: {
              createdAt: { gte: dayStart, lte: dayEnd }
            }
          }
        }
      })

      dailyUsers.push(dayUsers)
      dailyActiveUsers.push(dayActiveUsers)
    }

    // Searches Analytics
    const totalSearches = await prisma.search.count()
    const periodSearches = await prisma.search.count({
      where: { createdAt: { gte: startDate } }
    })

    // Daily searches
    const dailySearches = []
    const searchSuccessRates = []
    const avgResponseTimes = []

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

      const daySearches = await prisma.search.count({
        where: { createdAt: { gte: dayStart, lte: dayEnd } }
      })

      // Mock data for success rates and response times (implement with real data)
      const successRate = 95 + Math.random() * 4 // 95-99%
      const avgResponseTime = 800 + Math.random() * 400 // 800-1200ms

      dailySearches.push(daySearches)
      searchSuccessRates.push(successRate)
      avgResponseTimes.push(avgResponseTime)
    }

    // Provider performance (mock data for now)
    const providerPerformance = [
      { provider: 'Proprietary Scanner', count: Math.floor(periodSearches * 0.6), percentage: 60 },
      { provider: 'Google Vision', count: Math.floor(periodSearches * 0.25), percentage: 25 },
      { provider: 'TinEye', count: Math.floor(periodSearches * 0.15), percentage: 15 }
    ]

    // Revenue Analytics
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'active' },
      include: { user: true }
    })

    const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0) / 100
    
    const revenueByPlan = activeSubscriptions.reduce((acc, sub) => {
      if (!acc[sub.plan]) {
        acc[sub.plan] = { revenue: 0, count: 0 }
      }
      acc[sub.plan].revenue += sub.amount / 100
      acc[sub.plan].count += 1
      return acc
    }, {} as Record<string, { revenue: number; count: number }>)

    const revenueByPlanArray = Object.entries(revenueByPlan).map(([plan, data]) => ({
      plan,
      revenue: Math.round(data.revenue),
      percentage: (data.revenue / totalRevenue) * 100
    }))

    // Monthly revenue trend
    const monthlyRevenue = []
    const monthlyArpu = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      
      const monthSubs = await prisma.subscription.findMany({
        where: {
          status: 'active',
          createdAt: { lte: monthEnd },
          OR: [
            { updatedAt: { gte: monthStart } },
            { status: { not: 'canceled' } }
          ]
        }
      })

      const monthRevenue = monthSubs.reduce((sum, sub) => sum + sub.amount, 0) / 100
      const arpu = monthSubs.length > 0 ? monthRevenue / monthSubs.length : 0

      monthlyRevenue.push(monthRevenue)
      monthlyArpu.push(arpu)
    }

    // System Performance (mock data)
    const systemUptime = Array.from({ length: days }, () => 0.99 + Math.random() * 0.009)
    const systemErrors = Array.from({ length: days }, () => Math.floor(Math.random() * 5))
    const systemPerformance = Array.from({ length: days }, () => 0.1 + Math.random() * 0.3)

    // Calculate LTV
    const avgChurnRate = 0.05 // 5% monthly churn (mock)
    const avgMonthlyRevenue = monthlyRevenue.length > 0 
      ? monthlyRevenue.reduce((a, b) => a + b, 0) / monthlyRevenue.length
      : 0
    const avgActiveUsers = activeUsers > 0 ? activeUsers : 1
    const avgArpu = avgMonthlyRevenue / avgActiveUsers
    const ltv = Math.round(avgArpu / avgChurnRate)

    const analytics = {
      users: {
        total: totalUsers,
        growth: [userGrowthRate],
        newUsers: dailyUsers,
        activeUsers: dailyActiveUsers,
        churnRate: Array.from({ length: Math.floor(days / 7) }, () => Math.random() * 0.1) // Weekly churn
      },
      searches: {
        total: totalSearches,
        daily: dailySearches,
        byProvider: providerPerformance,
        successRate: searchSuccessRates,
        avgResponseTime: avgResponseTimes
      },
      revenue: {
        total: Math.round(totalRevenue),
        monthly: monthlyRevenue.map(r => Math.round(r)),
        byPlan: revenueByPlanArray,
        arpu: monthlyArpu.map(a => Math.round(a)),
        ltv
      },
      system: {
        uptime: systemUptime,
        errors: systemErrors,
        performance: systemPerformance
      }
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}