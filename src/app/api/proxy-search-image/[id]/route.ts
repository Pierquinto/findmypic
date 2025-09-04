import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server';
import { imageStorage } from '@/lib/storage/imageStorage'
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ricerca richiesto' },
        { status: 400 }
      )
    }

    // Verifica che l'utente abbia accesso a questa ricerca
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Autenticazione richiesta' },
        { status: 401 }
      )
    }

    // Cerca la ricerca nel database
    const search = await prisma.search.findUnique({
      where: { id },
      select: { 
        id: true,
        userId: true,
        imageUrl: true, 
        encryptedImagePath: true,
        createdAt: true
      }
    })

    if (!search) {
      return NextResponse.json(
        { error: 'Ricerca non trovata' },
        { status: 404 }
      )
    }

    // Check if user is admin
    const isAdmin = (user as any).isAdmin || (user as any).role === 'admin'

    // Verifica che l'utente abbia accesso a questa ricerca (admin possono accedere a tutto)
    if (!isAdmin && search.userId !== user.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato a questa ricerca' },
        { status: 403 }
      )
    }

    let imageData = null

    if (search.imageUrl && !search.imageUrl.startsWith('/api/')) {
      // Se abbiamo un URL pubblico, reindirizza ad esso
      return NextResponse.redirect(search.imageUrl)
    } else if (search.encryptedImagePath) {
      try {
        // Decrittografa il path dell'immagine
        const decryptedPath = decryptSensitiveData(search.encryptedImagePath as any)
        imageData = await imageStorage.getImage(decryptedPath)
      } catch (error) {
        console.error('Error decrypting image path:', error)
        return NextResponse.json(
          { error: 'Impossibile decrittografare il path dell\'immagine' },
          { status: 400 }
        )
      }
    }
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Immagine non trovata' },
        { status: 404 }
      )
    }

    // Determina il content type
    const contentType = imageData.metadata.mimeType || 'image/jpeg'
    
    // Restituisci l'immagine con cache appropriata
    return new NextResponse(imageData.buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageData.buffer.length.toString(),
        'Content-Disposition': `inline; filename="search-${id}.jpg"`,
        'Cache-Control': 'private, max-age=3600', // Cache per 1 ora
        'X-Content-Type-Options': 'nosniff'
      }
    })

  } catch (error) {
    console.error('Error serving search image:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
