import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/violations - Get user's violations with optional filtering
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    
    // Optional filters
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const whereClause: any = {
      userId
    }
    
    if (status) whereClause.status = status
    if (category) whereClause.category = category
    if (priority) whereClause.priority = priority

    const violations = await prisma.violation.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    const totalCount = await prisma.violation.count({
      where: whereClause
    })

    return NextResponse.json({
      violations,
      totalCount,
      pagination: {
        limit,
        offset,
        hasMore: (offset + violations.length) < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching violations:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST /api/violations - Create a new violation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const body = await req.json()
    
    const {
      searchId,
      searchResultId,
      title,
      description,
      priority = 'medium',
      category = 'general',
      siteName,
      imageUrl,
      webPageUrl,
      similarity,
      provider,
      thumbnail,
      status: resultStatus,
      metadata
    } = body

    // Validate required fields
    if (!title || !siteName) {
      return NextResponse.json(
        { error: 'Titolo e nome del sito sono richiesti' },
        { status: 400 }
      )
    }

    // Check if violation already exists for this search result
    if (searchResultId) {
      const existingViolation = await prisma.violation.findFirst({
        where: {
          userId,
          searchResultId
        }
      })
      
      if (existingViolation) {
        return NextResponse.json(
          { error: 'Violazione già salvata per questo risultato' },
          { status: 409 }
        )
      }
    }

    const violation = await prisma.violation.create({
      data: {
        userId,
        searchId,
        searchResultId,
        title,
        description,
        priority,
        status: 'pending',
        category,
        siteName,
        imageUrl,
        webPageUrl,
        similarity,
        provider,
        thumbnail,
        detectedAt: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    return NextResponse.json(violation, { status: 201 })

  } catch (error) {
    console.error('Error creating violation:', error)
    return NextResponse.json(
      { error: 'Errore nella creazione della violazione' },
      { status: 500 }
    )
  }
}

// DELETE /api/violations - Delete violation(s)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    
    const violationId = searchParams.get('id')
    const searchResultId = searchParams.get('searchResultId')
    
    if (!violationId && !searchResultId) {
      return NextResponse.json(
        { error: 'ID violazione o ID risultato ricerca richiesto' },
        { status: 400 }
      )
    }

    let whereClause: any = { userId }
    
    if (violationId) {
      whereClause.id = violationId
    } else if (searchResultId) {
      whereClause.searchResultId = searchResultId
    }

    const deletedViolations = await prisma.violation.deleteMany({
      where: whereClause
    })

    if (deletedViolations.count === 0) {
      return NextResponse.json(
        { error: 'Violazione non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: `${deletedViolations.count} violazione/i eliminate`,
      deletedCount: deletedViolations.count
    })

  } catch (error) {
    console.error('Error deleting violation:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della violazione' },
      { status: 500 }
    )
  }
}