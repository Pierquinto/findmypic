import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request)
    
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