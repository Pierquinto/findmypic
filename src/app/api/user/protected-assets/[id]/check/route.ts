import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { GoogleVisionProvider } from '@/lib/search/providers/GoogleVisionProvider'
import { ProprietaryProvider } from '@/lib/search/providers/ProprietaryProvider'
import { ImageProcessor } from '@/lib/imageProcessor'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface RouteParams {
  params: { id: string }
}

// Run manual monitoring check for protected asset
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const assetId = params.id

    // Get the protected asset
    const asset = await prisma.protectedAsset.findFirst({
      where: { id: assetId, userId }
    })

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset non trovato' },
        { status: 404 }
      )
    }

    // Read the image file
    let imageData: string
    try {
      const imagePath = join(process.cwd(), 'public', asset.imageUrl)
      const imageBuffer = await readFile(imagePath)
      imageData = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
    } catch (error) {
      console.error('Error reading asset image:', error)
      return NextResponse.json(
        { error: 'Errore nella lettura dell\'immagine' },
        { status: 500 }
      )
    }

    // Initialize providers
    const providers: { name: string, provider: any }[] = []
    
    // Proprietary provider (always available)
    const proprietaryProvider = new ProprietaryProvider()
    providers.push({ name: 'proprietary', provider: proprietaryProvider })

    // Google Vision if configured
    const googleApiKey = process.env.GOOGLE_VISION_API_KEY
    if (googleApiKey) {
      try {
        const googleProvider = new GoogleVisionProvider(googleApiKey)
        const isAvailable = await googleProvider.isAvailable()
        
        if (isAvailable) {
          providers.push({ name: 'google_vision', provider: googleProvider })
        }
      } catch (error) {
        console.error('Error initializing Google Vision provider:', error)
      }
    }

    if (providers.length === 0) {
      return NextResponse.json(
        { error: 'Nessun provider disponibile per il monitoraggio' },
        { status: 503 }
      )
    }

    // Prepare search query
    const searchQuery = {
      imageData,
      options: {
        maxResults: 50,
        similarityThreshold: 70,
        includeSafeSearch: true,
        includeAdultSites: true
      }
    }

    // Run search on all available providers
    let allResults: any[] = []
    const searchStartTime = Date.now()

    for (const { name, provider } of providers) {
      try {
        const providerResults = await provider.search(searchQuery)
        if (providerResults && Array.isArray(providerResults)) {
          allResults = allResults.concat(providerResults)
        }
      } catch (error) {
        console.error(`Provider ${name} failed:`, error)
      }
    }

    const searchTime = Date.now() - searchStartTime

    // Remove duplicates and filter violations
    const uniqueResults = allResults
      .filter((result, index, self) => 
        index === self.findIndex(r => r.url === result.url)
      )
      .sort((a, b) => b.similarity - a.similarity)

    // Process thumbnails for better display
    const resultsWithThumbnails = await ImageProcessor.createThumbnailsForResults(uniqueResults)

    // Count violations (results with status 'violation' or high similarity)
    const violations = resultsWithThumbnails.filter(result => 
      result.status === 'violation' || result.similarity >= 85
    )

    // Get previous monitoring result to calculate new/resolved violations
    const previousResult = await prisma.assetMonitoringResult.findFirst({
      where: { protectedAssetId: assetId },
      orderBy: { createdAt: 'desc' }
    })

    const previousViolations = previousResult?.violationsFound || 0
    const currentViolations = violations.length
    const newViolations = Math.max(0, currentViolations - previousViolations)
    const resolvedViolations = Math.max(0, previousViolations - currentViolations)

    // Create monitoring result record
    const monitoringResult = await prisma.assetMonitoringResult.create({
      data: {
        protectedAssetId: assetId,
        monitoringDate: new Date(),
        violationsFound: currentViolations,
        newViolations,
        resolvedViolations,
        results: JSON.stringify({
          violations: violations.map(v => ({
            id: v.id,
            url: v.url,
            siteName: v.siteName,
            similarity: v.similarity,
            status: v.status,
            provider: v.provider
          })),
          searchTime,
          providersUsed: providers.map(p => p.name),
          totalResults: resultsWithThumbnails.length
        }),
        status: 'completed'
      }
    })

    // Update asset with latest monitoring info and violation count
    await prisma.protectedAsset.update({
      where: { id: assetId },
      data: {
        lastMonitoredAt: new Date(),
        totalViolations: currentViolations,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Controllo completato con successo',
      result: {
        monitoringId: monitoringResult.id,
        violationsFound: currentViolations,
        newViolations,
        resolvedViolations,
        searchTime,
        providersUsed: providers.map(p => p.name)
      }
    })

  } catch (error) {
    console.error('Error running asset monitoring check:', error)
    
    // Try to create a failed monitoring result
    try {
      await prisma.assetMonitoringResult.create({
        data: {
          protectedAssetId: params.id,
          monitoringDate: new Date(),
          violationsFound: 0,
          newViolations: 0,
          resolvedViolations: 0,
          results: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }),
          status: 'failed'
        }
      })
    } catch (saveError) {
      console.error('Error saving failed monitoring result:', saveError)
    }

    return NextResponse.json(
      { error: 'Errore durante il controllo dell\'asset' },
      { status: 500 }
    )
  }
}