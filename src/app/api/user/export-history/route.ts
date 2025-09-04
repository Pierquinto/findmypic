import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Get all user searches with full details
    const searches = await prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        SearchLog: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    // Format data for export
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        userEmail: user.email,
        totalSearches: searches.length,
        exportFormat: 'JSON'
      },
      searches: searches.map(search => {
        let decryptedResults = null
        
        try {
          if (search.encryptedResults) {
            const decryptedData = decryptSensitiveData(search.encryptedResults)
            decryptedResults = typeof decryptedData === 'string' ? JSON.parse(decryptedData) : decryptedData
          }
        } catch (error) {
          console.warn('Could not decrypt results for export:', search.id)
        }

        return {
          id: search.id,
          searchDate: search.createdAt.toISOString(),
          searchType: search.searchType,
          resultsCount: search.resultsCount,
          searchTimeMs: search.searchTime,
          providersUsed: search.providersUsed,
          status: search.status,
          // Include results if available
          results: decryptedResults || search.results,
          // Include search log info if available
          searchLog: search.SearchLog[0] ? {
            imageSize: search.SearchLog[0].imageSize,
            imageMimeType: search.SearchLog[0].imageMimeType,
            totalResults: search.SearchLog[0].totalResults,
            apiCallsCount: search.SearchLog[0].apiCallsCount,
            geoLocation: search.SearchLog[0].geoLocation
          } : null
        }
      })
    }

    // Create JSON response
    const jsonString = JSON.stringify(exportData, null, 2)
    
    return new NextResponse(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cronologia-ricerche-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })

  } catch (error) {
    console.error('Error exporting search history:', error)
    return NextResponse.json(
      { error: 'Errore nell\'esportazione della cronologia' },
      { status: 500 }
    )
  }
}