import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request) {
  try {
    const user = await requireAuth()
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Accesso non autorizzato' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Log the deletion for audit purposes
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE_ACCOUNT',
        resource: 'USER',
        resourceId: userId,
        details: {
          email: user.email,
          deletedAt: new Date().toISOString(),
          reason: 'user_requested'
        }
      }
    })

    // Delete user data in correct order due to foreign key constraints
    // 1. Delete search logs first
    await prisma.searchLog.deleteMany({
      where: { userId }
    })

    // 2. Delete asset monitoring results
    const userAssets = await prisma.protectedAsset.findMany({
      where: { userId },
      select: { id: true }
    })
    
    for (const asset of userAssets) {
      await prisma.assetMonitoringResult.deleteMany({
        where: { protectedAssetId: asset.id }
      })
    }

    // 3. Delete protected assets
    await prisma.protectedAsset.deleteMany({
      where: { userId }
    })

    // 4. Delete searches
    await prisma.search.deleteMany({
      where: { userId }
    })

    // 5. Delete custom search requests
    await prisma.customSearchRequest.deleteMany({
      where: { userId }
    })

    // 6. Delete subscriptions
    await prisma.subscription.deleteMany({
      where: { userId }
    })

    // 7. Delete activity logs
    await prisma.activityLog.deleteMany({
      where: { userId }
    })

    // 8. Delete user profile
    await prisma.userProfile.deleteMany({
      where: { userId }
    })

    // 9. Finally delete the user
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      success: true,
      message: 'Account eliminato con successo'
    })

  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Errore nell\'eliminazione dell\'account' },
      { status: 500 }
    )
  }
}