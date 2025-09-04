import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma'
import { getRemainingSearches, shouldResetSearches, getUserMaxSearches } from '@/lib/limits'

export async function GET() {
  try {
    const authUser = await getUser()
    
    if (!authUser?.id) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        plan: true,
        searches: true,
        searchesResetAt: true,
        customSearchLimit: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Check if searches need to be reset
    if (shouldResetSearches(user.searchesResetAt)) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { 
          searches: 0, 
          searchesResetAt: new Date() 
        }
      })
      user.searches = 0
    }

    const maxSearches = getUserMaxSearches(user.plan, user.customSearchLimit)
    const remaining = getRemainingSearches(user.searches, user.plan, user.searchesResetAt, user.customSearchLimit)

    return NextResponse.json({
      plan: user.plan,
      searches: user.searches,
      maxSearches,
      remaining,
      hasCustomLimit: user.customSearchLimit !== null
    })

  } catch (error) {
    console.error('Error fetching user limits:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}