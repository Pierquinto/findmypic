import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { 
      imageData, 
      searchType = 'general_search', 
      anonymous = false
    } = await req.json()

    if (!imageData) {
      return NextResponse.json(
        { error: 'Immagine richiesta' },
        { status: 400 }
      )
    }

    // Try to get authenticated user (optional for anonymous searches)
    const authUser = await getServerUser(req)
    
    console.log('Auth user:', authUser?.email || 'anonymous')
    console.log('Anonymous flag:', anonymous)

    return NextResponse.json({
      success: true,
      user: authUser ? { id: authUser.id, email: authUser.email } : null,
      searchType,
      anonymous,
      results: []
    })

  } catch (error) {
    console.error('Simple search error:', error)
    return NextResponse.json(
      { error: 'Errore durante la ricerca: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}