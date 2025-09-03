import { NextRequest, NextResponse } from 'next/server'
import { imageStorage } from '@/lib/storage/imageStorage'
import { prisma } from '@/lib/prisma'
import { decryptSensitiveData } from '@/lib/encryption'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token richiesto' },
        { status: 400 }
      )
    }

    // Cerca il token nel database
    const imageToken = await prisma.imageToken.findUnique({
      where: { token },
      include: {
        search: {
          select: {
            id: true,
            imageUrl: true,
            encryptedImagePath: true
          }
        }
      }
    })

    if (!imageToken) {
      return NextResponse.json(
        { error: 'Token non valido' },
        { status: 404 }
      )
    }

    // Verifica che il token non sia scaduto
    if (imageToken.expiresAt < new Date()) {
      // Elimina il token scaduto
      await prisma.imageToken.delete({
        where: { token }
      })
      
      return NextResponse.json(
        { error: 'Token scaduto' },
        { status: 410 }
      )
    }

    const search = imageToken.search
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
        'Content-Disposition': `inline; filename="search-${search.id}.jpg"`,
        'Cache-Control': 'public, max-age=300', // Cache per 5 minuti
        'X-Content-Type-Options': 'nosniff'
      }
    })

  } catch (error) {
    console.error('Error serving public image:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
