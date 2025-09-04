import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma'
import { hasSearchesRemaining, getUserMaxSearches, shouldResetSearches } from '@/lib/limits'
import { saveEncryptedSearch } from '@/lib/search/searchMiddleware'
import { createDataHash } from '@/lib/encryption'
import { GoogleVisionProvider } from '@/lib/search/providers/GoogleVisionProvider'
import { ProprietaryProvider } from '@/lib/search/providers/ProprietaryProvider'
import { SearchLogger } from '@/lib/search/searchLogger'
import { ImageProcessor } from '@/lib/imageProcessor'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { 
      imageData, 
      searchType = 'general_search', 
      securityLevel = 'standard',
      advancedOptions = {},
      anonymous = false
    } = await req.json()

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

    // Ottieni informazioni della richiesta per il logging sicuro
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Genera ID univoco per questa ricerca
    const searchId = uuidv4()
    
    // Inizializza logger dettagliato
    const logger = new SearchLogger(searchId, {
      searchId,
      userId,
      email: user?.email || null,
      imageData,
      imageHash: createDataHash(imageData),
      ipAddress,
      userAgent,
      searchType,
      searchQuery: {
        searchType,
        securityLevel,
        userPlan: user?.plan || 'anonymous',
        maxResults: user?.plan === 'free' ? 10 : user?.plan === 'basic' ? 25 : user?.plan === 'pro' ? 50 : 5,
        similarityThreshold: searchType === 'copyright_detection' ? 85 : 75
      }
    })

    const searchStartTime = Date.now()

    try {
      // Salva immagine processata
      logger.logStep({ step: 'saving_image', success: true })
      await logger.saveProcessedImage()
      
      // Rileva geolocalizzazione
      if (ipAddress && ipAddress !== 'unknown') {
        logger.logStep({ step: 'detecting_geolocation', success: true })
        await logger.detectGeoLocation(ipAddress)
      }
      
      // Ottieni il path dell'immagine salvata
      const savedImagePath = logger.imageStoragePath
      // Inizializza provider disponibili
      logger.logStep({ step: 'initializing_providers', success: true })
      const availableProviders: { name: string, provider: any }[] = []
      
      // Provider proprietario (sempre disponibile)
      const proprietaryProvider = new ProprietaryProvider()
      availableProviders.push({ name: 'proprietary', provider: proprietaryProvider })
      logger.logStep({ step: 'proprietary_provider_loaded', success: true, provider: 'FindMyPic' })

      // Google Vision API se configurata
      const googleApiKey = process.env.GOOGLE_VISION_API_KEY
      console.log(`[Search] Google Vision API Key configured: ${googleApiKey ? 'YES' : 'NO'}`)
      
      if (googleApiKey) {
        try {
          logger.logStep({ step: 'testing_google_vision', success: true, provider: 'Google' })
          console.log(`[Search] Initializing Google Vision provider...`)
          
          const googleProvider = new GoogleVisionProvider(googleApiKey)
          console.log(`[Search] Testing Google Vision availability...`)
          
          const isAvailable = await googleProvider.isAvailable()
          console.log(`[Search] Google Vision available: ${isAvailable}`)
          
          if (isAvailable) {
            availableProviders.push({ name: 'google_vision', provider: googleProvider })
            logger.logStep({ step: 'google_vision_available', success: true, provider: 'Google' })
            console.log(`[Search] Google Vision added to available providers`)
          } else {
            logger.logStep({ step: 'google_vision_unavailable', success: false, provider: 'Google', error: 'API availability test failed' })
            console.log(`[Search] Google Vision availability test failed`)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.logStep({ 
            step: 'google_vision_error', 
            success: false, 
            provider: 'Google', 
            error: errorMessage
          })
          console.error(`[Search] Google Vision error:`, error)
        }
      } else {
        logger.logStep({ step: 'google_vision_not_configured', success: true, warning: 'No API key provided' })
        console.log(`[Search] Google Vision API key not configured`)
      }

      // Se nessun provider è disponibile, restituisci risultato vuoto
      if (availableProviders.length === 0) {
        logger.logStep({ step: 'no_providers_available', success: false, error: 'No search providers configured or available' })
        
        const searchTime = Date.now() - searchStartTime
        
        const noProviderResult = {
          count: 0,
          hasMatches: false,
          providers: [],
          searchTime,
          searchType,
          timestamp: new Date().toISOString(),
          message: 'Nessun provider di ricerca disponibile al momento'
        }

        // Salva logs e ricerca
        await logger.saveLogs('completed', 0)
        
        const savedSearchId = await saveEncryptedSearch(
          {
            userId,
            imageUrl: savedImagePath ? savedImagePath : null,
            searchType,
            ipAddress,
            userAgent
          },
          {
            id: searchId,
            results: [],
            providersUsed: {},
            searchTime,
            status: 'completed'
          },
          noProviderResult
        )

        // Aggiorna l'URL dell'immagine con l'endpoint pubblico se abbiamo salvato un'immagine
        if (savedImagePath) {
          await prisma.search.update({
            where: { id: savedSearchId },
            data: { imageUrl: `/api/search-images/${savedSearchId}` }
          })
        }

        return NextResponse.json({
          searchId: savedSearchId,
          results: [],
          metadata: {
            totalResults: 0,
            searchTime,
            providersUsed: [],
            searchType,
            securityLevel,
            providersFailures: [],
            message: 'Nessuna violazione trovata. Nessun provider di ricerca è attualmente disponibile.'
          },
          user: user ? {
            searches: user.searches + 1,
            maxSearches,
            plan: user.plan
          } : null,
          disclaimer: {
            searchMethod: 'automated_reverse_image_search',
            dataProtection: 'encrypted_storage_6_months',
            providerStatus: 'no_providers_available'
          }
        })
      }

      // Prepara la query di ricerca
      const userPlan = user?.plan || 'anonymous'
      const searchQuery = {
        imageData,
        searchType,
        userPlan,
        options: {
          maxResults: userPlan === 'free' ? 10 : userPlan === 'basic' ? 25 : userPlan === 'pro' ? 50 : 5,
          similarityThreshold: searchType === 'copyright_detection' ? 85 : 75,
          includeSafeSearch: true,
          includeAdultSites: userPlan !== 'free' && userPlan !== 'anonymous', // Solo per utenti paganti
          
          // Opzioni avanzate dal frontend (solo per utenti pro/basic)
          ...(userPlan !== 'free' && userPlan !== 'anonymous' && advancedOptions && {
            detectFaces: advancedOptions.detectFaces || false,
            detectLogos: advancedOptions.detectLogos || false,
            detectLandmarks: advancedOptions.detectLandmarks || false,
            detectText: advancedOptions.detectText || false,
            detectObjects: advancedOptions.detectObjects || false,
            analyzeLabels: advancedOptions.analyzeLabels || false,
            maxFaces: advancedOptions.maxFaces || 10,
            faceConfidenceThreshold: advancedOptions.faceConfidenceThreshold || 0.7,
            includeFaceGeo: advancedOptions.includeFaceGeo || false
          })
        }
      }

      // Esegui ricerche su tutti i provider disponibili
      logger.logStep({ step: 'starting_provider_searches', success: true })
      let allResults: any[] = []
      const providersUsed: string[] = []
      const providersFailures: string[] = []

      for (const { name, provider } of availableProviders) {
        try {
          logger.logStep({ step: 'provider_search_starting', success: true, provider: provider.name })
          
          const providerStartTime = Date.now()
          const providerResults = await provider.search(searchQuery)
          const providerDuration = Date.now() - providerStartTime
          
          if (providerResults && Array.isArray(providerResults)) {
            allResults = allResults.concat(providerResults)
            providersUsed.push(name)
            
            logger.logProviderSearch(
              provider.name,
              true,
              providerResults,
              undefined,
              1 // Conta una chiamata API per provider
            )
            
            console.log(`[Search] ${provider.name}: Found ${providerResults.length} results in ${providerDuration}ms`)
          } else {
            logger.logProviderSearch(
              provider.name,
              true,
              [],
              undefined,
              1
            )
            console.log(`[Search] ${provider.name}: No results found in ${providerDuration}ms`)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[Search] ${provider.name} failed:`, error)
          providersFailures.push(name)
          
          logger.logProviderSearch(
            provider.name,
            false,
            [],
            errorMessage,
            1
          )
        }
      }

      const searchTime = Date.now() - searchStartTime

      // Rimuovi duplicati e ordina per similarità
      logger.logStep({ step: 'processing_results', success: true })
      const uniqueResults = allResults
        .filter((result, index, self) => 
          index === self.findIndex(r => r.url === result.url)
        )
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, searchQuery.options.maxResults)

      // Process thumbnails for better display
      logger.logStep({ step: 'processing_thumbnails', success: true })
      const resultsWithThumbnails = await ImageProcessor.createThumbnailsForResults(uniqueResults)

      logger.logStep({ 
        step: 'results_processed', 
        success: true, 
        results: resultsWithThumbnails.map(r => ({ url: r.url, similarity: r.similarity, provider: r.provider, thumbnailProcessed: r.thumbnailProcessed }))
      })

      // Prepara risultati pubblici (sanitizzati) per il frontend
      const publicResults = {
        count: resultsWithThumbnails.length,
        hasMatches: resultsWithThumbnails.length > 0,
        providers: providersUsed,
        searchTime,
        searchType,
        timestamp: new Date().toISOString()
      }

      // Crea un hash dell'immagine per identificazione
      const imageHash = createDataHash(imageData)

      // Salva la ricerca con crittografia usando il nostro middleware PRIMA dei logs
      const savedSearchId = await saveEncryptedSearch(
        {
          userId: userId || null, // Allow anonymous searches
          imageUrl: savedImagePath ? savedImagePath : null,
          searchType,
          ipAddress,
          userAgent
        },
        {
          id: searchId,
          results: resultsWithThumbnails, // Risultati completi con thumbnails (verranno crittografati)
          providersUsed: providersUsed.reduce((acc, p) => { acc[p] = true; return acc }, {}),
          searchTime,
          status: 'completed'
        },
        publicResults // Risultati pubblici (non crittografati)
      )

      // Aggiorna l'URL dell'immagine con l'endpoint pubblico se abbiamo salvato un'immagine
      if (savedImagePath) {
        await prisma.search.update({
          where: { id: savedSearchId },
          data: { imageUrl: `/api/search-images/${savedSearchId}` }
        })
      }

      // Salva logs dettagliati DOPO aver creato il Search record
      await logger.saveLogs('completed', resultsWithThumbnails.length)

      // Aggiorna il contatore delle ricerche dell'utente (solo se autenticato)
      if (user && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            searches: user.searches + 1
          }
        })
      }
      
      logger.logStep({ step: 'search_completed', success: true })

      // Restituisci solo i risultati pubblici al frontend
      return NextResponse.json({
        searchId: savedSearchId,
        results: resultsWithThumbnails.map(result => {
          const isPro = user?.plan === 'pro'
          const isFree = user?.plan === 'free'
          
          return {
            // Informazioni base disponibili per tutti
            id: result.id,
            siteName: result.siteName,
            similarity: result.similarity,
            status: result.status,
            provider: result.provider,
            thumbnail: result.thumbnail,
            
            // Titolo: completo per pro/basic, generico per free
            title: !isFree ? result.title : 'Risultato trovato',
            
            // Per utenti PRO: link chiari e separati
            ...(isPro && {
              imageUrl: result.url,          // Link diretto all'immagine compromessa
              webPageUrl: result.webPageUrl, // Link alla pagina web che la contiene
              directLinks: {
                image: result.url,           // Link esplicito all'immagine
                webpage: result.webPageUrl,  // Link esplicito alla pagina
                description: result.webPageUrl ? 
                  `Immagine trovata su: ${result.siteName}` : 
                  'Solo immagine disponibile'
              }
            }),
            
            // Per utenti BASIC: link base (comportamento precedente)
            ...(!isFree && !isPro && {
              url: result.url,
              webPageUrl: result.webPageUrl
            }),
            
            // Per utenti FREE: solo anteprima (nessun link diretto)
            ...(isFree && {
              url: undefined,
              webPageUrl: undefined,
              previewOnly: true
            }),
            
            // Metadata dettagliati solo per utenti premium
            metadata: !isFree ? result.metadata : undefined
          }
        }),
        metadata: {
          totalResults: resultsWithThumbnails.length,
          searchTime,
          providersUsed: providersUsed,
          searchType,
          securityLevel,
          providersFailures: providersFailures,
          message: resultsWithThumbnails.length === 0 ? 'Nessuna violazione trovata nei database disponibili.' : `Trovati ${resultsWithThumbnails.length} possibili match.`
        },
        user: user ? {
          searches: user.searches + 1,
          maxSearches: getUserMaxSearches(user.plan, user.customSearchLimit),
          plan: user.plan
        } : null,
        disclaimer: {
          searchMethod: 'automated_reverse_image_search',
          description: 'Ricerca automatica inversa su provider terzi e siti specializzati',
          coverage: `Provider attivi: ${providersUsed.join(', ')}`,
          dataProtection: 'encrypted_storage_6_months',
          dataRetention: user?.plan === 'free' ? '6_months_automatic' : user ? 'user_controlled' : 'anonymous_session_only'
        }
      })

    } catch (searchError) {
      console.error('Search execution error:', searchError)
      
      // Log dell'errore
      logger.logStep({ 
        step: 'search_failed', 
        success: false, 
        error: searchError instanceof Error ? searchError.message : 'Unknown search error'
      })
      
      // Salva logs dell'errore
      await logger.saveLogs('failed', 0)
      
      // Salva la ricerca fallita per debug
      try {
        const failedSearchId = await saveEncryptedSearch(
          {
            userId: userId || null,
            imageUrl: null, // Non abbiamo salvato l'immagine in caso di errore
            searchType,
            ipAddress,
            userAgent
          },
          {
            id: searchId,
            results: [],
            providersUsed: {},
            searchTime: Date.now() - searchStartTime,
            status: 'failed'
          },
          { 
            error: searchError instanceof Error ? searchError.message : 'Ricerca fallita', 
            timestamp: new Date().toISOString() 
          }
        )

        // Aggiorna l'URL dell'immagine con l'endpoint pubblico se abbiamo salvato un'immagine
        if (savedImagePath) {
          await prisma.search.update({
            where: { id: failedSearchId },
            data: { imageUrl: `/api/search-images/${failedSearchId}` }
          })
        }
      } catch (saveError) {
        console.error('Error saving failed search:', saveError)
      }

      return NextResponse.json(
        { error: 'Errore durante la ricerca' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}