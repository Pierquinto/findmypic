import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export interface AdminUser {
  id: string
  email: string
  isAdmin: boolean
  isSuperAdmin: boolean
  permissions: string[]
}

export async function requireAdmin(request: NextRequest): Promise<AdminUser | NextResponse> {
  try {
    const user = await requireAuth(request)
    
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        isAdmin: true
      }
    })

    if (!dbUser || (!dbUser.isAdmin && dbUser.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return {
      id: dbUser.id,
      email: dbUser.email,
      isAdmin: true,
      isSuperAdmin: (dbUser.permissions as string[])?.includes('super_admin') || false,
      permissions: (dbUser.permissions as string[]) || []
    }

  } catch (error) {
    console.error('Admin auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export function requirePermission(permission: string) {
  return async (adminUser: AdminUser): Promise<boolean> => {
    if (adminUser.isSuperAdmin) return true
    return adminUser.permissions.includes(permission)
  }
}

export const ADMIN_PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  SUBSCRIPTIONS_READ: 'subscriptions:read',
  SUBSCRIPTIONS_WRITE: 'subscriptions:write',
  ANALYTICS_READ: 'analytics:read',
  SYSTEM_READ: 'system:read',
  SYSTEM_WRITE: 'system:write',
  SEARCH_CONFIG: 'search:config',
  LOGS_READ: 'logs:read'
} as const