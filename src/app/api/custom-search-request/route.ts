import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const customSearchRequestSchema = z.object({
  email: z.string().email('Email non valida'),
  name: z.string().optional(),
  requestType: z.enum(['manual_search', 'deep_analysis', 'custom_sites']).default('manual_search'),
  description: z.string().min(10, 'La descrizione deve essere di almeno 10 caratteri'),
  urgencyLevel: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  targetSites: z.array(z.string()).optional(),
  additionalInfo: z.record(z.any()).optional()
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await req.json()
    
    // Validazione input
    const validatedData = customSearchRequestSchema.parse(body)
    
    // Calcola costo stimato basato sul tipo di richiesta
    let estimatedCost = 0
    switch (validatedData.requestType) {
      case 'manual_search':
        estimatedCost = 29.99
        break
      case 'deep_analysis':
        estimatedCost = 49.99
        break
      case 'custom_sites':
        estimatedCost = 79.99
        break
    }
    
    // Calcola priorità basata sull'urgenza e se l'utente è registrato
    let priority = 0
    if (validatedData.urgencyLevel === 'urgent') priority += 100
    else if (validatedData.urgencyLevel === 'high') priority += 50
    else if (validatedData.urgencyLevel === 'normal') priority += 10
    
    if (session) priority += 25 // Utenti registrati hanno priorità

    // Crea la richiesta
    const customRequest = await prisma.customSearchRequest.create({
      data: {
        userId: session ? (session.user as any).id : null,
        email: validatedData.email,
        name: validatedData.name,
        requestType: validatedData.requestType,
        description: validatedData.description,
        urgencyLevel: validatedData.urgencyLevel,
        targetSites: validatedData.targetSites || [],
        additionalInfo: validatedData.additionalInfo || {},
        estimatedCost,
        priority
      }
    })

    // Log dell'attività
    await prisma.activityLog.create({
      data: {
        userId: session ? (session.user as any).id : null,
        action: 'CUSTOM_SEARCH_REQUEST_CREATED',
        resource: 'custom_search',
        resourceId: customRequest.id,
        details: {
          requestType: validatedData.requestType,
          urgencyLevel: validatedData.urgencyLevel,
          estimatedCost,
          priority,
          isRegisteredUser: !!session
        },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Richiesta personalizzata inviata con successo',
      requestId: customRequest.id,
      estimatedCost,
      priority,
      expectedResponse: validatedData.urgencyLevel === 'urgent' ? '24-48 ore' : 
                       validatedData.urgencyLevel === 'high' ? '2-3 giorni' : '5-7 giorni',
      disclaimer: {
        dataRetention: 'La richiesta verrà conservata per 12 mesi per elaborazione e follow-up',
        pricing: 'I prezzi sono stimati e potrebbero variare in base alla complessità',
        processing: 'Riceverai una conferma via email entro 24 ore'
      }
    })

  } catch (error) {
    console.error('Error creating custom search request:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dati non validi', 
          details: error.errors.map(err => err.message)
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    
    // Ottieni le richieste dell'utente
    const userRequests = await prisma.customSearchRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        requestType: true,
        description: true,
        urgencyLevel: true,
        estimatedCost: true,
        status: true,
        adminNotes: true,
        completedAt: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      requests: userRequests,
      totalRequests: userRequests.length,
      pendingRequests: userRequests.filter(r => r.status === 'waiting').length
    })

  } catch (error) {
    console.error('Error fetching user custom requests:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}