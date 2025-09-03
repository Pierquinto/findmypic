import { NextRequest, NextResponse } from 'next/server'
import { signUp } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    console.log('Registration attempt for email:', email)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    console.log('Creating user with Supabase Auth...')
    const result = await signUp(email, password)
    
    console.log('User created successfully:', result.user?.id)

    return NextResponse.json({
      message: 'User created successfully. Please check your email for verification.',
      user: {
        id: result.user?.id,
        email: result.user?.email
      },
      needsEmailVerification: !result.session
    })
  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    )
  }
}