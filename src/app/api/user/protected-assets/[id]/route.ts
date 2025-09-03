import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

// Update protected asset
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id
    const assetId = params.id
    const updateData = await req.json()

    // Verify asset belongs to user
    const existingAsset = await prisma.protectedAsset.findFirst({
      where: { id: assetId, userId }
    })

    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Asset non trovato' },
        { status: 404 }
      )
    }

    // Update asset
    const updatedAsset = await prisma.protectedAsset.update({
      where: { id: assetId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Asset aggiornato con successo'
    })

  } catch (error) {
    console.error('Error updating protected asset:', error)
    return NextResponse.json(
      { error: 'Errore nell\'aggiornamento dell\'asset' },
      { status: 500 }
    )
  }
}

// Delete protected asset
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(req)
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id
    const assetId = params.id

    // Verify asset belongs to user
    const existingAsset = await prisma.protectedAsset.findFirst({
      where: { id: assetId, userId }
    })

    if (!existingAsset) {
      return NextResponse.json(
        { error: 'Asset non trovato' },
        { status: 404 }
      )
    }

    // Delete asset and all related monitoring results (cascade will handle this)
    await prisma.protectedAsset.delete({
      where: { id: assetId }
    })

    // TODO: Also delete the physical file
    // This would require implementing file cleanup

    return NextResponse.json({
      success: true,
      message: 'Asset eliminato con successo'
    })

  } catch (error) {
    console.error('Error deleting protected asset:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione dell\'asset' },
      { status: 500 }
    )
  }
}