import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma'
import { getUserMaxSearches, shouldResetSearches } from '@/lib/limits'

export async function GET() {
  try {
    const authUser = await requireAuth()
    
    if (!authUser?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = authUser.id

    // Get user info
    let user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Check if searches need to be reset
    if (shouldResetSearches(user.searchesResetAt)) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { 
          searches: 0, 
          searchesResetAt: new Date() 
        }
      })
      user = updatedUser
    }

    // Get current subscription if exists
    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId,
        status: 'active'
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get user search limits (considering custom limits)
    const maxSearches = getUserMaxSearches(user.plan, user.customSearchLimit)

    // Mock invoices for now (you can implement real billing later)
    const mockInvoices = subscription ? [
      {
        id: 'inv_001',
        date: subscription.currentPeriodStart,
        description: `FindMyPic ${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} - Abbonamento Mensile`,
        status: 'paid',
        amount: subscription.amount
      }
    ] : []

    return NextResponse.json({
      currentPlan: user.plan,
      searches: user.searches,
      maxSearches,
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency
      } : null,
      invoices: mockInvoices
    })

  } catch (error) {
    console.error('Error fetching billing info:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}