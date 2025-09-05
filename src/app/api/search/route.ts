import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { hasSearchesRemaining, getUserMaxSearches, shouldResetSearches } from '@/lib/limits'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    console.log('Search API called')
    
    const { 
      imageData, 
      searchType = 'general_search', 
      securityLevel = 'standard',
      advancedOptions = {},
      anonymous = false
    } = await req.json()

    console.log('Received request body:', { imageData: !!imageData, searchType, anonymous })

    if (!imageData) {
      return NextResponse.json(
        { error: 'Immagine richiesta' },
        { status: 400 }
      )
    }

    // Try to get authenticated user (optional for anonymous searches)
    const authUser = await getUser()
    let user = null
    let userId = null

    console.log('Auth user:', authUser?.id)

    // Handle authenticated users
    if (authUser?.id && !anonymous) {
      userId = authUser.id
      user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Utente non trovato' },
          { status: 404 }
        )
      }
    }

    // Check search limits for authenticated users
    if (user && userId) {
      // Check if searches need to be reset
      if (shouldResetSearches(user.searchesResetAt)) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { 
            searches: 0, 
            searchesResetAt: new Date() 
          }
        })
        user = updatedUser
      }

      if (!hasSearchesRemaining(user.searches, user.plan, user.searchesResetAt, user.customSearchLimit)) {
        const maxSearches = getUserMaxSearches(user.plan, user.customSearchLimit)
        return NextResponse.json(
          { 
            error: 'Limite ricerche raggiunto',
            plan: user.plan,
            searches: user.searches,
            maxSearches
          },
          { status: 429 }
        )
      }
    }

    console.log('Starting search processing...')

    // Generate search ID
    const searchId = uuidv4()
    const searchStartTime = Date.now()

    // For now, return mock results to test if the API works
    const mockResults = [
      {
        id: '1',
        url: 'https://example.com/image1.jpg',
        siteName: 'Example Site',
        title: 'Test Result 1',
        similarity: 95,
        status: 'found',
        provider: 'test',
        thumbnail: null,
        metadata: {}
      }
    ]

    const searchTime = Date.now() - searchStartTime

    // Update user search count if authenticated
    if (user && userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          searches: user.searches + 1
        }
      })
    }

    console.log('Search completed successfully')

    return NextResponse.json({
      searchId,
      results: mockResults.map(result => {
        const isPro = user?.plan === 'pro'
        const isFree = user?.plan === 'free'
        
        return {
          // Basic info for all users
          id: result.id,
          siteName: result.siteName,
          similarity: result.similarity,
          status: result.status,
          provider: result.provider,
          thumbnail: result.thumbnail,
          title: !isFree ? result.title : 'Risultato trovato',
          
          // Pro users get full access
          ...(isPro && {
            imageUrl: result.url,
            webPageUrl: result.url
          }),
          
          // Basic users get basic access
          ...(!isFree && !isPro && {
            url: result.url
          }),
          
          // Free users get preview only
          ...(isFree && {
            url: undefined,
            webPageUrl: undefined,
            previewOnly: true
          }),
          
          metadata: !isFree ? result.metadata : undefined
        }
      }),
      metadata: {
        totalResults: mockResults.length,
        searchTime,
        providersUsed: ['test'],
        searchType,
        securityLevel,
        providersFailures: [],
        message: `Trovati ${mockResults.length} risultati di test.`
      },
      user: user ? {
        searches: user.searches + 1,
        maxSearches: getUserMaxSearches(user.plan, user.customSearchLimit),
        plan: user.plan
      } : null,
      disclaimer: {
        searchMethod: 'test_search',
        description: 'Ricerca di test per verificare funzionalità API',
        coverage: 'Provider di test',
        dataProtection: 'encrypted_storage_6_months',
        dataRetention: user?.plan === 'free' ? '6_months_automatic' : user ? 'user_controlled' : 'anonymous_session_only'
      }
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Search API is working',
    methods: ['POST'],
    status: 'ok'
  })
}