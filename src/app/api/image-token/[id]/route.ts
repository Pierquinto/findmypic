import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createDataHash } from '@/lib/encryption'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ricerca richiesto' },
        { status: 400 }
      )
    }

    // Verifica che l'utente abbia accesso a questa ricerca
    if (!session?.user || !(session.user as any).id) {
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
    const isAdmin = (session.user as any).isAdmin || (session.user as any).role === 'admin'

    // Verifica che l'utente abbia accesso a questa ricerca (admin possono accedere a tutto)
    if (!isAdmin && search.userId !== (session.user as any).id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato a questa ricerca' },
        { status: 403 }
      )
    }

    // Genera un token temporaneo per l'immagine
    const tokenData = {
      searchId: id,
      userId: (session.user as any).id,
      timestamp: Date.now()
    }
    
    const token = createDataHash(JSON.stringify(tokenData))
    
    // Salva il token temporaneo nel database con scadenza
    await prisma.imageToken.create({
      data: {
        token,
        searchId: id,
        userId: (session.user as any).id,
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
