import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'

// GET /api/violations/[id] - Get specific violation
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { id } = params

    const violation = await prisma.violation.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!violation) {
      return NextResponse.json(
        { error: 'Violazione non trovata' },
        { status: 404 }
      )
    }

    return NextResponse.json(violation)

  } catch (error) {
    console.error('Error fetching violation:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PATCH /api/violations/[id] - Update violation
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { id } = params
    const body = await req.json()

    // Check if violation exists and belongs to user
    const existingViolation = await prisma.violation.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existingViolation) {
      return NextResponse.json(
        { error: 'Violazione non trovata' },
        { status: 404 }
      )
    }

    // Allowed fields to update
    const allowedUpdates = [
      'title',
      'description',
      'priority',
      'status',
      'category',
      'actionsTaken',
      'evidence'
    ]

    const updateData: any = {}
    
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Set resolvedAt if status is being changed to resolved
    if (body.status === 'resolved' && existingViolation.status !== 'resolved') {
      updateData.resolvedAt = new Date()
    } else if (body.status && body.status !== 'resolved') {
      updateData.resolvedAt = null
    }

    const updatedViolation = await prisma.violation.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updatedViolation)

  } catch (error) {
    console.error('Error updating violation:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento della violazione' },
      { status: 500 }
    )
  }
}

// DELETE /api/violations/[id] - Delete specific violation
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    const { id } = params

    // Check if violation exists and belongs to user
    const existingViolation = await prisma.violation.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existingViolation) {
      return NextResponse.json(
        { error: 'Violazione non trovata' },
        { status: 404 }
      )
    }

    await prisma.violation.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Violazione eliminata con successo'
    })

  } catch (error) {
    console.error('Error deleting violation:', error)
    return NextResponse.json(
      { error: 'Errore nella cancellazione della violazione' },
      { status: 500 }
    )
  }
}