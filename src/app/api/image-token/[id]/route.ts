import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { createDataHash } from '@/lib/encryption'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req)
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ricerca richiesto' },
        { status: 400 }
      )
    }

    // Verifica che l'utente abbia accesso a questa ricerca
    if (!user?.id) {
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

    // Genera un token temporaneo per l'immagine
    const tokenData = {
      searchId: id,
      userId: user.id,
      timestamp: Date.now()
    }
    
    const token = createDataHash(JSON.stringify(tokenData))
    
    // Salva il token temporaneo nel database con scadenza
    await prisma.imageToken.create({
      data: {
        token,
        searchId: id,
        userId: user.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minuti
      }
    })

    return NextResponse.json({
      token,
      imageUrl: `/api/public-image/${token}`
    })

  } catch (error) {
    console.error('Error generating image token:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}
