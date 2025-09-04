import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    
    return NextResponse.json({
      authenticated: !!user,
      user: user ? {
        id: user.id,
        email: user.email
      } : null,
      authHeader: request.headers.get('Authorization') ? 'Present' : 'Missing'
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}