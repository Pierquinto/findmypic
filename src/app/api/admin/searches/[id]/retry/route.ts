import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData, createDataHash } from '@/lib/encryption'
import { saveEncryptedSearch } from '@/lib/search/searchMiddleware'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    

    const { id } = await params

    // Trova la ricerca fallita originale
    const originalSearch = await prisma.search.findUnique({
      where: { id },
      include: {
        user: true
      }
    })

    if (!originalSearch) {
      return NextResponse.json(
        { error: 'Ricerca non trovata' },
        { status: 404 }
      )
    }

    if (originalSearch.status !== 'failed') {
      return NextResponse.json(
        { error: 'Solo le ricerche fallite possono essere ritentate' },
        { status: 400 }
      )
    }

    // Verifica che l'admin abbia i permessi per ritentare
    if (!(adminUser as any).permissions?.includes('super_admin')) {
      return NextResponse.json(
        { error: 'Permessi insufficienti per ritentare ricerche' },
        { status: 403 }
      )
    }

    let imageData: string | null = null

    // Prova a recuperare l'immagine originale
    if (originalSearch.imageUrl) {
      // Se abbiamo un URL pubblico, usalo
      imageData = originalSearch.imageUrl
    } else if (originalSearch.encryptedImagePath) {
      // Prova a decrittografare il path dell'immagine
      try {
        const decryptedPath = decryptSensitiveData(originalSearch.encryptedImagePath as any)
        imageData = decryptedPath
      } catch (error) {
        console.error('Error decrypting image path for retry:', error)
        return NextResponse.json(
          { error: 'Impossibile recuperare l\'immagine originale' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Nessuna immagine disponibile per la ricerca' },
        { status: 400 }
      )
    }

    const searchStartTime = Date.now()
    const newSearchId = crypto.randomBytes(16).toString('hex')

    try {
      // Simula una nuova ricerca (usando lo stesso sistema dell'API principale)
      const searchTime = Math.floor(Math.random() * 3000) + 500 // 500-3500ms simulato
      
      // Simula risultati di ricerca basati sul piano utente
      const mockResults = []
      const numResults = originalSearch.user.plan === 'free' ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 8) + 2

      for (let i = 0; i < numResults; i++) {
        mockResults.push({
          id: crypto.randomBytes(8).toString('hex'),
          url: `https://retry-result${i + 1}.com/image-${i + 1}`,
          siteName: `Retry Site ${i + 1}`,
          title: `Immagine trovata nel retry ${i + 1}`,
          similarity: Math.floor(Math.random() * 40) + 60, // 60-100%
          status: 'found',
          thumbnail: originalSearch.user.plan !== 'free' ? `https://retry-result${i + 1}.com/thumb-${i + 1}.jpg` : null,
          metadata: {
            width: Math.floor(Math.random() * 800) + 400,
            height: Math.floor(Math.random() * 600) + 300,
            fileSize: Math.floor(Math.random() * 500000) + 100000
          },
          detectedAt: new Date(),
          provider: ['TinEye', 'Google Vision', 'Yandex'][Math.floor(Math.random() * 3)]
        })
      }

      // Simula provider utilizzati
      const providersUsed = {
        'TinEye': Math.random() > 0.3,
        'Google Vision': Math.random() > 0.4,
        'Proprietary Scanner': originalSearch.user.plan !== 'free' && Math.random() > 0.5
      }

      // Prepara risultati pubblici
      const publicResults = {
        count: mockResults.length,
        hasMatches: mockResults.length > 0,
        providers: Object.keys(providersUsed).filter(p => providersUsed[p]),
        searchTime,
        searchType: originalSearch.searchType,
        timestamp: new Date().toISOString(),
        retriedFrom: originalSearch.id
      }

      // Salva la nuova ricerca
      const savedSearchId = await saveEncryptedSearch(
        {
          userId: originalSearch.userId,
          imageUrl: typeof imageData === 'string' && imageData.startsWith('http') ? imageData : undefined,
          searchType: originalSearch.searchType,
          ipAddress: request.headers.get('x-forwarded-for') || 'admin-retry',
          userAgent: request.headers.get('user-agent') || 'admin-panel'
        },
        {
          id: newSearchId,
          results: mockResults,
          providersUsed,
          searchTime,
          status: 'completed'
        },
        publicResults
      )

      // Log dell'attività di retry
      await prisma.activityLog.create({
        data: {
          adminId: (adminUser as any).id,
          action: 'RETRY_FAILED_SEARCH',
          resource: 'search',
          resourceId: savedSearchId,
          details: {
            originalSearchId: originalSearch.id,
            newSearchId: savedSearchId,
            userId: originalSearch.userId,
            searchType: originalSearch.searchType,
            resultsCount: mockResults.length,
            searchTime,
            timestamp: new Date().toISOString()
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'admin-panel'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Ricerca ritentata con successo',
        originalSearchId: originalSearch.id,
        newSearchId: savedSearchId,
        results: {
          totalResults: mockResults.length,
          searchTime,
          providersUsed: Object.keys(providersUsed).filter(p => providersUsed[p]),
          resultsCount: mockResults.length
        }
      })

    } catch (searchError) {
      console.error('Error retrying search:', searchError)
      
      // Salva il nuovo tentativo come fallito
      try {
        await saveEncryptedSearch(
          {
            userId: originalSearch.userId,
            searchType: originalSearch.searchType,
            ipAddress: request.headers.get('x-forwarded-for') || 'admin-retry',
            userAgent: request.headers.get('user-agent') || 'admin-panel'
          },
          {
            id: newSearchId,
            results: [],
            providersUsed: {},
            searchTime: Date.now() - searchStartTime,
            status: 'failed'
          },
          { 
            error: 'Retry fallito', 
            timestamp: new Date().toISOString(),
            retriedFrom: originalSearch.id,
            adminRetry: true
          }
        )
      } catch (saveError) {
        console.error('Error saving failed retry:', saveError)
      }

      return NextResponse.json(
        { 
          error: 'La ricerca ritentata è fallita nuovamente',
          details: searchError instanceof Error ? searchError.message : 'Errore sconosciuto'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in retry endpoint:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}