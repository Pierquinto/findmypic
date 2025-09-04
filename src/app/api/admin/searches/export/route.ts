import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const searchType = searchParams.get('searchType')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const hasImage = searchParams.get('hasImage')
    const includeDecrypted = searchParams.get('includeDecrypted') === 'true'

    // Build where clause (same logic as main searches route)
    const whereClause: any = {}
    
    if (userId) {
      whereClause.user = {
        email: {
          contains: userId,
          mode: 'insensitive'
        }
      }
    }
    
    if (searchType && searchType !== 'all') {
      whereClause.searchType = searchType
    }
    
    if (status && status !== 'all') {
      whereClause.status = status
    }
    
    if (hasImage && hasImage !== 'all') {
      if (hasImage === 'yes') {
        whereClause.OR = [
          { imageUrl: { not: null } },
          { encryptedImagePath: { not: null } }
        ]
      } else {
        whereClause.AND = [
          { imageUrl: null },
          { encryptedImagePath: null }
        ]
      }
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    const searches = await prisma.search.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Prepara i dati per l'export CSV
    const csvHeaders = [
      'ID',
      'Data/Ora',
      'Email Utente',
      'Tipo Ricerca',
      'Status',
      'Numero Risultati',
      'Tempo Ricerca (ms)',
      'Ha Immagine',
      'Hash Immagine',
      'Provider Utilizzati'
    ]

    if (includeDecrypted && (adminUser as any).permissions?.includes('super_admin')) {
      csvHeaders.push('IP Address (Decrypted)', 'User Agent (Decrypted)')
    }

    const csvRows = [csvHeaders.join(',')]

    for (const search of searches) {
      const row = [
        search.id,
        new Date(search.createdAt).toLocaleString('it-IT'),
        `"${search.user.email}"`,
        search.searchType,
        search.status,
        search.resultsCount.toString(),
        search.searchTime ? search.searchTime.toString() : '',
        (search.imageUrl || search.encryptedImagePath) ? 'Sì' : 'No',
        search.imageHash || '',
        search.providersUsed ? `"${Object.keys(search.providersUsed).join(', ')}"` : ''
      ]

      if (includeDecrypted && (adminUser as any).permissions?.includes('super_admin')) {
        try {
          const decryptedIp = search.ipAddress ? decryptSensitiveData(search.ipAddress as any) : ''
          const decryptedUA = search.userAgent ? decryptSensitiveData(search.userAgent as any) : ''
          row.push(`"${decryptedIp}"`, `"${decryptedUA}"`)
        } catch (error) {
          row.push('Error decrypting', 'Error decrypting')
        }
      }

      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    // Log dell'attività di export
    await prisma.activityLog.create({
      data: {
        adminId: (adminUser as any).id,
        action: 'EXPORT_SEARCHES',
        resource: 'search',
        details: {
          filters: {
            userId,
            searchType,
            status,
            dateFrom,
            dateTo,
            hasImage
          },
          totalRecords: searches.length,
          includeDecrypted,
          timestamp: new Date().toISOString()
        },
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    })

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="searches-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error exporting searches:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'export' },
      { status: 500 }
    )
  }
}