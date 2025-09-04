import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    console.log('User created successfully:', data.user?.id)

    return NextResponse.json({
      message: 'User created successfully. Please check your email for verification.',
      user: {
        id: data.user?.id,
        email: data.user?.email
      },
      needsEmailVerification: !data.session
    })
  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    )
  }
}