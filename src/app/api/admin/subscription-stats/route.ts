import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    // Calculate current month dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Active subscriptions count
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'active' }
    })

    // Calculate MRR (Monthly Recurring Revenue)
    const activeSubscriptionsList = await prisma.subscription.findMany({
      where: { status: 'active' },
      select: { amount: true }
    })

    const mrr = activeSubscriptionsList.reduce((sum, sub) => sum + sub.amount, 0) / 100

    // Calculate monthly growth
    const currentMonthSubscriptions = await prisma.subscription.count({
      where: {
        status: 'active',
        createdAt: { gte: currentMonthStart }
      }
    })

    const lastMonthSubscriptions = await prisma.subscription.count({
      where: {
        status: 'active',
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    })

    const monthlyGrowth = lastMonthSubscriptions > 0 
      ? ((currentMonthSubscriptions - lastMonthSubscriptions) / lastMonthSubscriptions * 100)
      : 0

    // Calculate churn rate
    const canceledThisMonth = await prisma.subscription.count({
      where: {
        status: 'canceled',
        updatedAt: { gte: currentMonthStart }
      }
    })

    const totalActiveAtMonthStart = await prisma.subscription.count({
      where: {
        createdAt: { lt: currentMonthStart },
        OR: [
          { status: 'active' },
          { 
            status: 'canceled',
            updatedAt: { gte: currentMonthStart }
          }
        ]
      }
    })

    const churnRate = totalActiveAtMonthStart > 0 
      ? (canceledThisMonth / totalActiveAtMonthStart * 100)
      : 0

    // Revenue by plan
    const revenueByPlan = await prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'active' },
      _sum: { amount: true },
      _count: { plan: true }
    })

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      
      const monthSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'active',
          createdAt: { lte: monthEnd },
          OR: [
            { updatedAt: { gte: monthStart } },
            { status: { not: 'canceled' } }
          ]
        },
        select: { amount: true }
      })

      const revenue = monthSubscriptions.reduce((sum, sub) => sum + sub.amount, 0) / 100

      monthlyRevenue.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        revenue,
        subscriptions: monthSubscriptions.length
      })
    }

    // Payment failures and issues
    const paymentIssues = await prisma.subscription.count({
      where: {
        status: { in: ['past_due', 'incomplete'] }
      }
    })

    // Plan distribution
    const planDistribution = await prisma.subscription.groupBy({
      by: ['plan', 'status'],
      _count: { plan: true }
    })

    const stats = {
      overview: {
        activeSubscriptions,
        mrr: Math.round(mrr),
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
        paymentIssues
      },
      revenueByPlan: revenueByPlan.map(item => ({
        plan: item.plan,
        revenue: Math.round((item._sum.amount || 0) / 100),
        count: item._count.plan
      })),
      monthlyRevenue,
      planDistribution: planDistribution.reduce((acc, item) => {
        if (!acc[item.plan]) acc[item.plan] = {}
        acc[item.plan][item.status] = item._count.plan
        return acc
      }, {} as Record<string, Record<string, number>>),
      metrics: {
        arpu: activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0, // Average Revenue Per User
        ltv: Math.round(mrr / (churnRate / 100) * 12), // Lifetime Value (simplified)
        cac: 25, // Customer Acquisition Cost (mock - integrate with marketing data)
        netRevenue: Math.round(mrr * 0.85) // After payment processing fees
      }
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching subscription stats:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}