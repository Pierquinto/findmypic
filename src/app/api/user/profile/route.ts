import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Get user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      searches: user.searches,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
      profile: user.profile
    })

  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Update user profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { firstName, lastName, company, phone, website, bio } = await req.json()

    // Update or create profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        website: website || null,
        bio: bio || null
      },
      create: {
        userId,
        firstName: firstName || null,
        lastName: lastName || null,
        company: company || null,
        phone: phone || null,
        website: website || null,
        bio: bio || null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      profile
    })

  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento del profilo' },
      { status: 500 }
    )
  }
}