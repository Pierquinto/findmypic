import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { hasSearchesRemaining, getUserMaxSearches, shouldResetSearches } from '@/lib/limits'
import { GoogleVisionProvider } from '@/lib/search/providers/GoogleVisionProvider'
import { SearchLogger } from '@/lib/search/searchLogger'
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
    
    // Initialize search logger
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    const searchLogger = new SearchLogger(searchId, {
      searchId,
      userId: userId || undefined,
      email: user?.email,
      imageData,
      ipAddress,
      userAgent,
      searchType
    })
    
    // Save the image to R2 storage
    await searchLogger.saveProcessedImage()

    // Initialize available providers
    const availableProviders: { name: string, provider: any }[] = []

    // Google Vision API if configured
    const googleApiKey = process.env.GOOGLE_VISION_API_KEY
    console.log(`[Search] Google Vision API Key configured: ${googleApiKey ? 'YES' : 'NO'}`)
    
    if (googleApiKey) {
      try {
        console.log(`[Search] Initializing Google Vision provider...`)
        
        const googleProvider = new GoogleVisionProvider(googleApiKey)
        console.log(`[Search] Testing Google Vision availability...`)
        
        const isAvailable = await googleProvider.isAvailable()
        console.log(`[Search] Google Vision available: ${isAvailable}`)
        
        if (isAvailable) {
          availableProviders.push({ name: 'google_vision', provider: googleProvider })
          console.log(`[Search] Google Vision added to available providers`)
        }
      } catch (error) {
        console.error(`[Search] Google Vision error:`, error)
      }
    }

    console.log(`[Search] Available providers: ${availableProviders.length}`)

    // If no providers available, still save the search and return empty results
    if (availableProviders.length === 0) {
      console.log('[Search] No providers available')
      
      // Still save search to database
      try {
        // Get the image URL directly from R2
        const imageUrl = searchLogger.getImageUrl()
        
        await prisma.search.create({
          data: {
            id: searchId,
            userId: userId || null,
            searchType,
            status: 'completed',
            resultsCount: 0,
            searchTime: Date.now() - searchStartTime,
            providersUsed: {},
            ipAddress,
            userAgent,
            imageUrl // Save the public R2 URL directly
          }
        })
        
        // Save logs
        await searchLogger.saveLogs('completed', 0)
        
      } catch (dbError) {
        console.error('Error saving search to database:', dbError)
        try {
          await searchLogger.saveLogs('failed', 0)
        } catch (logError) {
          console.error('Error saving search log:', logError)
        }
      }
      
      // Update user search count if authenticated
      if (user && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            searches: user.searches + 1
          }
        })
      }
      
      return NextResponse.json({
        searchId,
        results: [],
        metadata: {
          totalResults: 0,
          searchTime: Date.now() - searchStartTime,
          providersUsed: [],
          searchType,
          securityLevel,
          providersFailures: [],
          message: 'Nessun provider di ricerca disponibile al momento.'
        },
        user: user ? {
          searches: user.searches + 1,
          maxSearches: getUserMaxSearches(user.plan, user.customSearchLimit),
          plan: user.plan
        } : null,
        disclaimer: {
          searchMethod: 'reverse_image_search',
          description: 'Ricerca inversa immagini',
          coverage: 'Nessun provider disponibile',
          dataProtection: 'encrypted_storage_6_months'
        }
      })
    }

    // Prepare search query
    const userPlan = user?.plan || 'anonymous'
    const searchQuery = {
      imageData,
      searchType,
      userPlan,
      options: {
        maxResults: userPlan === 'free' ? 10 : userPlan === 'basic' ? 25 : userPlan === 'pro' ? 50 : 5,
        similarityThreshold: searchType === 'copyright_detection' ? 85 : 75,
        includeSafeSearch: true,
        includeAdultSites: userPlan !== 'free' && userPlan !== 'anonymous'
      }
    }

    // Execute search on all available providers
    let allResults: any[] = []
    const providersUsed: string[] = []
    const providersFailures: string[] = []

    for (const { name, provider } of availableProviders) {
      try {
        console.log(`[Search] Starting search with ${provider.name}...`)
        
        const providerStartTime = Date.now()
        const providerResults = await provider.search(searchQuery)
        const providerDuration = Date.now() - providerStartTime
        
        if (providerResults && Array.isArray(providerResults)) {
          allResults = allResults.concat(providerResults)
          providersUsed.push(name)
          console.log(`[Search] ${provider.name}: Found ${providerResults.length} results in ${providerDuration}ms`)
        } else {
          console.log(`[Search] ${provider.name}: No results found in ${providerDuration}ms`)
        }
      } catch (error) {
        console.error(`[Search] ${provider.name} failed:`, error)
        providersFailures.push(name)
      }
    }

    const searchTime = Date.now() - searchStartTime

    // Remove duplicates and sort by similarity
    const uniqueResults = allResults
      .filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      )
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, searchQuery.options.maxResults)

    console.log(`[Search] Final results: ${uniqueResults.length}`)

    // Save search to database using the search logger
    try {
      // Get the image URL directly from R2
      const imageUrl = searchLogger.getImageUrl()
      
      console.log('Search API saving imageUrl to database:', imageUrl)
      
      // Save search record to database
      await prisma.search.create({
        data: {
          id: searchId,
          userId: userId || null,
          searchType,
          status: 'completed',
          resultsCount: uniqueResults.length,
          searchTime,
          providersUsed: providersUsed.reduce((acc, p) => { acc[p] = true; return acc }, {}),
          ipAddress,
          userAgent,
          imageUrl // Save the public R2 URL directly
        }
      })
      
      // Log the providers used
      for (const providerName of providersUsed) {
        searchLogger.logProviderSearch(providerName, true, [], undefined, 1)
      }
      
      for (const providerName of providersFailures) {
        searchLogger.logProviderSearch(providerName, false, [], 'Provider failed', 1)
      }
      
      // Save detailed logs
      await searchLogger.saveLogs('completed', uniqueResults.length)
      
    } catch (dbError) {
      console.error('Error saving search to database:', dbError)
      // Try to log the failure
      try {
        await searchLogger.saveLogs('failed', 0)
      } catch (logError) {
        console.error('Error saving search log:', logError)
      }
      // Continue anyway - don't fail the search because of DB issues
    }

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
      results: uniqueResults.map(result => {
        const isPro = user?.plan === 'pro'
        const isFree = user?.plan === 'free'
        
        return {
          // Basic info for all users
          id: result.id || uuidv4(),
          siteName: result.siteName || 'Unknown Site',
          similarity: result.similarity || 0,
          status: result.status || 'found',
          provider: result.provider || 'google_vision',
          thumbnail: result.thumbnail || null,
          title: !isFree ? (result.title || 'Found Image') : 'Risultato trovato',
          
          // Pro users get full access
          ...(isPro && {
            imageUrl: result.url,
            webPageUrl: result.webPageUrl || result.url
          }),
          
          // Basic users get basic access
          ...(!isFree && !isPro && {
            url: result.url,
            webPageUrl: result.webPageUrl
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
        totalResults: uniqueResults.length,
        searchTime,
        providersUsed,
        searchType,
        securityLevel,
        providersFailures,
        message: uniqueResults.length === 0 ? 'Nessuna violazione trovata nei database disponibili.' : `Trovati ${uniqueResults.length} possibili match.`
      },
      user: user ? {
        searches: user.searches + 1,
        maxSearches: getUserMaxSearches(user.plan, user.customSearchLimit),
        plan: user.plan
      } : null,
      disclaimer: {
        searchMethod: 'reverse_image_search',
        description: 'Ricerca automatica inversa su Google Vision API',
        coverage: `Provider attivi: ${providersUsed.join(', ')}`,
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