import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const searchType = searchParams.get('searchType')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const hasImage = searchParams.get('hasImage')
    const decrypt = searchParams.get('decrypt') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const offset = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (userId) {
      // Cerca per email utente
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

    const [searches, totalCount] = await Promise.all([
      prisma.search.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.search.count({ where: whereClause })
    ])

    // Se è richiesta la decrittografia e l'admin ha i permessi
    const processedSearches = await Promise.all(
      searches.map(async (search) => {
        const processedSearch: any = {
          ...search,
          // Rimuovi i campi sensibili dal response di default
          encryptedResults: decrypt ? search.encryptedResults : undefined,
          encryptedImagePath: decrypt ? search.encryptedImagePath : undefined,
          ipAddress: decrypt ? search.ipAddress : undefined,
          userAgent: decrypt ? search.userAgent : undefined
        }

        // Aggiungi URL per l'anteprima dell'immagine
        if (search.imageUrl) {
          processedSearch.imagePreviewUrl = search.imageUrl
        } else if (search.encryptedImagePath) {
          // Per le immagini crittografate, usa l'endpoint admin
          processedSearch.imagePreviewUrl = `/api/search-images/${search.id}`
        }

        if (decrypt && (adminUser as any).permissions?.includes('super_admin')) {
          try {
            // Decrittografa i risultati se disponibili
            if (search.encryptedResults) {
              processedSearch.decryptedResults = decryptSensitiveData(search.encryptedResults as any)
            }

            // Decrittografa il path immagine se disponibile
            if (search.encryptedImagePath) {
              processedSearch.decryptedImagePath = decryptSensitiveData(search.encryptedImagePath as any)
            }

            // Decrittografa IP e User Agent se disponibili
            if (search.ipAddress) {
              processedSearch.decryptedIpAddress = decryptSensitiveData(search.ipAddress as any)
            }

            if (search.userAgent) {
              processedSearch.decryptedUserAgent = decryptSensitiveData(search.userAgent as any)
            }

            // Log dell'attività di decrittografia
            await prisma.activityLog.create({
              data: {
                adminId: (adminUser as any).id,
                action: 'DECRYPT_SEARCH_DATA',
                resource: 'search',
                resourceId: search.id,
                details: {
                  searchId: search.id,
                  decryptedFields: ['results', 'imagePath', 'ipAddress', 'userAgent'].filter(field => 
                    search[`encrypted${field.charAt(0).toUpperCase() + field.slice(1)}`]
                  ),
                  timestamp: new Date().toISOString()
                },
                ipAddress: request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip') || 
                          'unknown'
              }
            })
          } catch (error) {
            console.error('Error decrypting search data:', error)
            // In caso di errore nella decrittografia, continua senza decrittare
          }
        }

        return processedSearch
      })
    )

    return NextResponse.json({
      searches: processedSearches,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      decryptionEnabled: decrypt
    })

  } catch (error) {
    console.error('Error fetching searches:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}