import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/middleware'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        profile: true,
        Search: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        Subscription: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            Search: true,
            Subscription: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Remove sensitive data
    const { password, ...sanitizedUser } = user

    return NextResponse.json({ user: sanitizedUser })

  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    const { action, data } = await request.json()

    // Log admin action
    await prisma.activityLog.create({
      data: {
        adminId: adminUser.id,
        action: `USER_${action.toUpperCase()}`,
        resource: 'user',
        resourceId: params.id,
        details: data,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    let updateData: any = {}

    switch (action) {
      case 'activate':
        updateData = { isActive: true }
        break

      case 'deactivate':
        updateData = { isActive: false }
        break

      case 'change_plan':
        if (!data.plan) {
          return NextResponse.json(
            { error: 'Piano richiesto' },
            { status: 400 }
          )
        }
        updateData = { plan: data.plan }
        break

      case 'reset_searches':
        updateData = { 
          searches: 0,
          searchesResetAt: new Date()
        }
        break

      case 'set_search_limit':
        if (typeof data.searches !== 'number' || data.searches < 0) {
          return NextResponse.json(
            { error: 'Numero di ricerche non valido' },
            { status: 400 }
          )
        }
        updateData = { searches: data.searches }
        break

      case 'update_search_settings':
        const updates: any = {}
        
        if (typeof data.searches === 'number' && data.searches >= 0) {
          updates.searches = data.searches
        }
        
        if (data.customSearchLimit === null) {
          updates.customSearchLimit = null
        } else if (typeof data.customSearchLimit === 'number' && data.customSearchLimit > 0) {
          updates.customSearchLimit = data.customSearchLimit
        }
        
        updateData = updates
        break

      case 'update_permissions':
        updateData = { 
          role: data.role,
          permissions: data.permissions 
        }
        break

      case 'update_profile':
        // Handle basic user fields
        if (data.email) updateData.email = data.email
        
        // Handle profile fields separately
        if (data.profile) {
          const profileData = {
            firstName: data.profile.firstName || null,
            lastName: data.profile.lastName || null,
            company: data.profile.company || null,
            phone: data.profile.phone || null,
            website: data.profile.website || null,
            bio: data.profile.bio || null
          }

          // Update or create profile
          await prisma.userProfile.upsert({
            where: { userId: params.id },
            update: profileData,
            create: {
              userId: params.id,
              ...profileData
            }
          })
        }
        break

      case 'change_password':
        if (!data.newPassword || data.newPassword.length < 6) {
          return NextResponse.json(
            { error: 'La password deve essere di almeno 6 caratteri' },
            { status: 400 }
          )
        }
        const hashedPassword = await bcrypt.hash(data.newPassword, 10)
        updateData = { password: hashedPassword }
        break

      default:
        return NextResponse.json(
          { error: 'Azione non supportata' },
          { status: 400 }
        )
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      include: {
        profile: true,
        _count: {
          select: {
            Search: true,
            Subscription: true
          }
        }
      }
    })

    // Remove sensitive data
    const { password, ...sanitizedUser } = updatedUser

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      message: 'Utente aggiornato con successo'
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'aggiornamento' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const adminUser = await requireAdmin(request)
    if (adminUser instanceof NextResponse) return adminUser

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Log admin action
    await prisma.activityLog.create({
      data: {
        adminId: adminUser.id,
        action: 'USER_DELETE',
        resource: 'user',
        resourceId: params.id,
        details: { email: user.email },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Soft delete - mark as inactive instead of actually deleting
    // This preserves data integrity for searches and subscriptions
    await prisma.user.update({
      where: { id: params.id },
      data: { 
        isActive: false,
        email: `deleted_${Date.now()}_${user.email}` // Prevent email conflicts
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Utente eliminato con successo'
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'eliminazione' },
      { status: 500 }
    )
  }
}