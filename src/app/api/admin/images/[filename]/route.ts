import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { imageStorage } from '@/lib/storage/imageStorage'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !(session.user as any).isAdmin) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const { filename } = await params
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Nome file richiesto' },
        { status: 400 }
      )
    }

    let imageData = null

    // Se il filename è un ID di ricerca, cerca l'immagine associata
    if (filename.length === 32) { // Gli ID delle ricerche sono di 32 caratteri
      const { prisma } = await import('@/lib/prisma')
      const { decryptSensitiveData } = await import('@/lib/encryption')
      
      const search = await prisma.search.findUnique({
        where: { id: filename },
        select: { 
          imageUrl: true, 
          encryptedImagePath: true 
        }
      })

      if (search) {
        if (search.imageUrl) {
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
      }
    } else {
      // Altrimenti, tratta il filename come un nome file normale
      imageData = await imageStorage.getImage(filename)
    }
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'Immagine non trovata' },
        { status: 404 }
      )
    }

    // Determina il content type
    const contentType = imageData.metadata.mimeType || 'image/jpeg'
    
    // Restituisci l'immagine
    return new NextResponse(imageData.buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageData.buffer.length.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('Error serving image:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}