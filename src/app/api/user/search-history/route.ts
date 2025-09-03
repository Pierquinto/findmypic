import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Recupera le ricerche dell'utente con i risultati dalla nuova struttura
    const searches = await prisma.search.findMany({
      where: { 
        userId,
        status: 'completed' // Solo ricerche completate con successo
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        results: true, // Include SearchResult dalla tabella relazionale
        _count: {
          select: {
            results: true
          }
        }
      }
    })

    // Prepara i risultati per il frontend usando la nuova struttura
    const searchHistory = searches.map(search => ({
      id: search.id,
      imageUrl: search.imageUrl || (search.encryptedImagePath ? `/api/proxy-search-image/${search.id}` : null),
      searchType: search.searchType,
      resultsCount: search._count.results, // Usa il count reale dalla relazione
      searchTime: search.searchTime,
      createdAt: search.createdAt.toISOString(),
      providersUsed: search.providersUsed,
      hasResults: search.results.length > 0
    }))

    const totalCount = await prisma.search.count({
      where: { 
        userId,
        status: 'completed'
      }
    })

    return NextResponse.json({
      searches: searchHistory,
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching search history:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Recupera una singola ricerca dalla cronologia
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { searchId } = await req.json()

    if (!searchId) {
      return NextResponse.json(
        { error: 'ID ricerca richiesto' },
        { status: 400 }
      )
    }

    // Recupera la ricerca specifica con i risultati dalla tabella relazionale
    const search = await prisma.search.findFirst({
      where: { 
        id: searchId,
        userId,
        status: 'completed'
      },
      include: {
        results: true // Include i risultati dalla tabella SearchResult
      }
    })

    if (!search) {
      return NextResponse.json(
        { error: 'Ricerca non trovata' },
        { status: 404 }
      )
    }

    let results = []
    
    try {
      // Prima prova a decriptare i risultati completi se disponibili
      if (search.encryptedResults) {
        const decryptedData = decryptSensitiveData(search.encryptedResults)
        const decryptedResults = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedResults
        
        if (decryptedResults && Array.isArray(decryptedResults)) {
          results = decryptedResults
        }
      }
      
      // Se non ci sono risultati crittografati o la decrittazione fallisce,
      // usa i risultati dalla tabella SearchResult
      if (results.length === 0 && search.results && search.results.length > 0) {
        results = search.results.map(result => ({
          url: result.url,
          siteName: result.siteName,
          title: result.title,
          similarity: result.similarity,
          status: result.status,
          thumbnail: result.thumbnail,
          provider: result.provider,
          metadata: result.metadata,
          detectedAt: result.detectedAt.toISOString()
        }))
      }
    } catch (error) {
      console.warn('Could not decrypt results, using SearchResult table:', error)
      // Fallback ai risultati dalla tabella SearchResult
      if (search.results && search.results.length > 0) {
        results = search.results.map(result => ({
          url: result.url,
          siteName: result.siteName,
          title: result.title,
          similarity: result.similarity,
          status: result.status,
          thumbnail: result.thumbnail,
          provider: result.provider,
          metadata: result.metadata,
          detectedAt: result.detectedAt.toISOString()
        }))
      }
    }

    return NextResponse.json({
      searchId: search.id,
      imageUrl: search.imageUrl || (search.encryptedImagePath ? `/api/proxy-search-image/${search.id}` : null),
      searchType: search.searchType,
      results: results,
      metadata: {
        totalResults: results?.length || search.resultsCount,
        searchTime: search.searchTime,
        providersUsed: Object.keys(search.providersUsed || {}),
        createdAt: search.createdAt.toISOString(),
        fromHistory: true // Indica che proviene dalla cronologia
      }
    })

  } catch (error) {
    console.error('Error retrieving search from history:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// Delete a search from history
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { searchId } = await req.json()

    if (!searchId) {
      return NextResponse.json(
        { error: 'ID ricerca richiesto' },
        { status: 400 }
      )
    }

    // Verify search belongs to user and delete it
    const deletedSearch = await prisma.search.deleteMany({
      where: { 
        id: searchId,
        userId
      }
    })

    if (deletedSearch.count === 0) {
      return NextResponse.json(
        { error: 'Ricerca non trovata o non autorizzata' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ricerca eliminata dalla cronologia'
    })

  } catch (error) {
    console.error('Error deleting search from history:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}