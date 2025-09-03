import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await signOut()
    
    return NextResponse.json({
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('Logout error:', error)
    
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}