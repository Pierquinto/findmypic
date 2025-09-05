import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server'

export async function GET() {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Accesso non autorizzato' }, { status: 401 })
    }

    console.log('Profile API - User data:', {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      plan: user.plan
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}