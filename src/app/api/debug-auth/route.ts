import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    )
    
    const authHeader = req.headers.get('authorization')
    
    const user = await getUser()
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      cookies: {
        total: allCookies.length,
        auth: authCookies.map(c => ({ name: c.name, hasValue: !!c.value }))
      },
      headers: {
        authorization: authHeader ? 'Present' : 'Missing',
        userAgent: req.headers.get('user-agent')?.substring(0, 50) + '...'
      },
      user: user ? {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role
      } : null,
      authenticated: !!user
    })
  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json({
      error: 'Debug auth failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}