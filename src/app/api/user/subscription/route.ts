import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma'

// Create or update subscription
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id
    const { plan } = await req.json()

    if (!['free', 'basic', 'pro'].includes(plan)) {
      return NextResponse.json(
        { error: 'Piano non valido' },
        { status: 400 }
      )
    }

    // Update user plan
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        plan,
        searches: 0 // Reset searches when changing plan
      }
    })

    // If not free plan, create/update subscription
    if (plan !== 'free') {
      const planPrices = {
        basic: 999, // €9.99 in cents
        pro: 2999   // €29.99 in cents
      }

      const currentDate = new Date()
      const nextMonth = new Date(currentDate)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Deactivate old subscriptions
      await prisma.subscription.updateMany({
        where: { 
          userId,
          status: 'active'
        },
        data: { status: 'cancelled' }
      })

      // Create new subscription
      await prisma.subscription.create({
        data: {
          userId,
          plan,
          status: 'active',
          currentPeriodStart: currentDate,
          currentPeriodEnd: nextMonth,
          amount: planPrices[plan as keyof typeof planPrices],
          currency: 'EUR',
          priceId: `price_${plan}`,
          // In a real implementation, you would integrate with Stripe here
          stripeCustomerId: `cus_mock_${userId}`,
          stripeSubscriptionId: `sub_mock_${Date.now()}`
        }
      })
    } else {
      // If switching to free, cancel existing subscriptions
      await prisma.subscription.updateMany({
        where: { 
          userId,
          status: 'active'
        },
        data: { 
          status: 'cancelled',
          cancelAtPeriodEnd: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Piano aggiornato a ${plan.toUpperCase()}`
    })

  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del piano' },
      { status: 500 }
    )
  }
}

// Cancel subscription
export async function DELETE() {
  try {
    const user = await requireAuth()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id

    // Mark subscription for cancellation at period end
    await prisma.subscription.updateMany({
      where: { 
        userId,
        status: 'active'
      },
      data: { 
        cancelAtPeriodEnd: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Abbonamento annullato. Continuerà fino alla fine del periodo corrente.'
    })

  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return NextResponse.json(
      { error: 'Errore nell\'annullamento dell\'abbonamento' },
      { status: 500 }
    )
  }
}