import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    // Calcola statistiche utenti
    const totalUsers = await prisma.user.count()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    const activeUsers = await prisma.user.count({
      where: {
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // ultimi 30 giorni
        }
      }
    })

    // Statistiche per piano
    const planStats = await prisma.user.groupBy({
      by: ['plan'],
      _count: {
        plan: true
      }
    })

    const plans = {
      free: planStats.find(p => p.plan === 'free')?._count.plan || 0,
      basic: planStats.find(p => p.plan === 'basic')?._count.plan || 0,
      pro: planStats.find(p => p.plan === 'pro')?._count.plan || 0
    }

    // Statistiche ricerche
    const totalSearches = await prisma.search.count()
    
    const searchesToday = await prisma.search.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    })

    const avgSearchesPerUser = totalUsers > 0 ? Math.round(totalSearches / totalUsers * 100) / 100 : 0

    // Statistiche fatturato (mock per ora)
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)
    
    const activeSubscriptions = await prisma.subscription.count({
      where: {
        status: 'active'
      }
    })

    // Calcolo approssimativo del fatturato mensile
    const basicSubscriptions = await prisma.subscription.count({
      where: { plan: 'basic', status: 'active' }
    })
    
    const proSubscriptions = await prisma.subscription.count({
      where: { plan: 'pro', status: 'active' }
    })

    const monthlyRevenue = (basicSubscriptions * 9.99) + (proSubscriptions * 19.99)
    const totalRevenue = monthlyRevenue * 6 // Mock: 6 mesi di operazioni

    // Statistiche sistema
    const systemErrors = await prisma.activityLog.count({
      where: {
        action: 'ERROR',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // ultime 24 ore
        }
      }
    })

    // Calcolo uptime (mock)
    const uptime = '99.9%'

    // Mock additional metrics for enhanced dashboard
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)
    
    const searchesThisWeek = await prisma.search.count({
      where: {
        createdAt: {
          gte: thisWeek
        }
      }
    })

    // Calculate user growth
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const usersLastMonth = await prisma.user.count({
      where: {
        createdAt: {
          lt: lastMonth
        }
      }
    })

    const userGrowth = usersLastMonth > 0 ? ((totalUsers - usersLastMonth) / usersLastMonth * 100) : 0

    const stats = {
      users: {
        total: totalUsers,
        new: newUsersToday,
        active: activeUsers,
        growth: userGrowth,
        plans
      },
      searches: {
        total: totalSearches,
        today: searchesToday,
        thisWeek: searchesThisWeek,
        avgPerUser: avgSearchesPerUser,
        successRate: 96.5, // Mock success rate
        avgResponseTime: 850 // Mock avg response time in ms
      },
      revenue: {
        monthly: Math.round(monthlyRevenue),
        total: Math.round(totalRevenue),
        growth: 15.5, // Mock growth percentage
        mrr: Math.round(monthlyRevenue),
        churnRate: 3.2, // Mock churn rate
        arpu: totalUsers > 0 ? Math.round(monthlyRevenue / totalUsers) : 0
      },
      system: {
        uptime: '99.9%',
        providers: 3, // Numero di provider attivi
        errors: systemErrors,
        cpu: 45, // Mock CPU usage %
        memory: 62, // Mock memory usage %
        storage: 34, // Mock storage usage %
        activeConnections: Math.floor(Math.random() * 150) + 50 // Mock active connections
      }
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