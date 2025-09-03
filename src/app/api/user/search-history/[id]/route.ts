import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API: Getting search with ID:', params.id)
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('API: No session found')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('API: Session found for user:', session.user.email)
    const { id } = params

    // Find the search by ID and verify ownership
    console.log('API: Searching for search ID:', id)
    const search = await prisma.search.findFirst({
      where: {
        id: id,
        user: {
          email: session.user.email
        }
      },
      include: {
        results: true // Now we have a proper relation to SearchResult table
      }
    })

    console.log('API: Search found:', !!search)
    if (!search) {
      // Debug: Let's see what searches exist for this user
      const allUserSearches = await prisma.search.findMany({
        where: {
          user: {
            email: session.user.email
          }
        },
        select: {
          id: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })
      
      console.log('API: Available searches for user:', allUserSearches.map(s => ({ id: s.id, created: s.createdAt })))
      console.log('API: Search not found for ID:', id)
      return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    // Format the response with proper SearchResult objects
    const response = {
      searchId: search.id,
      imageUrl: search.imageUrl || (search.encryptedImagePath ? `/api/proxy-search-image/${search.id}` : null),
      searchType: search.searchType,
      resultsCount: search.resultsCount,
      searchTime: search.searchTime,
      createdAt: search.createdAt.toISOString(),
      results: search.results.map(result => ({
        id: result.id,
        url: result.url,
        siteName: result.siteName,
        title: result.title,
        similarity: result.similarity,
        status: result.status,
        thumbnail: result.thumbnail,
        provider: result.provider,
        detectedAt: result.detectedAt.toISOString()
      })),
      metadata: search.providersUsed
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching search:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}