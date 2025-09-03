import { NextRequest, NextResponse } from 'next/server'
import { signIn } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    console.log('Login attempt for email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    console.log('Authenticating with Supabase Auth...')
    const result = await signIn(email, password)
    
    if (!result.session) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('Login successful:', result.user.id)

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: result.user.email_confirmed_at !== null
      },
      session: {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_at: result.session.expires_at
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    )
  }
}