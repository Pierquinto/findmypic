import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { headers } from 'next/headers'

export type User = {
  id: string
  email: string
  isAdmin: boolean
  role: string
  permissions: any
  plan: string
  searches: number
  createdAt: Date
  profile: any
}

export async function getUser(): Promise<User | null> {
  try {
    // Check if Supabase environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
      console.warn('Supabase not configured, returning test user')
      // Return a test user for development
      return {
        id: 'test-user-id',
        email: 'test@example.com',
        isAdmin: false,
        role: 'user',
        permissions: {},
        plan: 'free',
        searches: 0,
        createdAt: new Date(),
        profile: {}
      }
    }
    
    console.log('[AUTH] Starting getUser() check...')
    
    // Try to get user from Authorization header first
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    
    let supabaseUser = null
    
    console.log('[AUTH] Authorization header:', authorization ? 'Present' : 'Missing')
    
    if (authorization && authorization.startsWith('Bearer ')) {
      console.log('[AUTH] Using Bearer token authentication')
      // Create admin client for token verification
      const adminClient = await createAdminClient()
      const token = authorization.replace('Bearer ', '')
      
      try {
        const { data: { user }, error } = await adminClient.auth.getUser(token)
        if (!error && user) {
          console.log('[AUTH] Bearer token valid, user:', user.email)
          supabaseUser = user
        } else {
          console.log('[AUTH] Bearer token invalid:', error?.message)
        }
      } catch (tokenError) {
        console.error('[AUTH] Error verifying Bearer token:', tokenError)
      }
    }
    
    // Fallback to cookies if no valid Authorization header
    if (!supabaseUser) {
      console.log('[AUTH] Fallback to cookie-based authentication')
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        console.log('[AUTH] No user found in cookies:', error?.message || 'No user')
        return null
      }
      console.log('[AUTH] Cookie authentication successful, user:', user.email)
      supabaseUser = user
    }

    // Get user data from Prisma, but also use Supabase user metadata for admin status
    let userData = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    if (!userData) {
      // Create user if doesn't exist
      userData = await createOrUpdateUser(supabaseUser)
    }

    // Best practice: Use Supabase user_metadata for role information (primary source)
    // Fall back to Prisma data if metadata not available
    const isAdminFromSupabase = supabaseUser.user_metadata?.isAdmin === true || 
                               supabaseUser.user_metadata?.role === 'admin' ||
                               supabaseUser.app_metadata?.role === 'admin'
    
    const roleFromSupabase = supabaseUser.user_metadata?.role || 
                            supabaseUser.app_metadata?.role ||
                            userData.role

    console.log('Admin check details:', {
      userId: supabaseUser.id,
      email: supabaseUser.email,
      user_metadata: supabaseUser.user_metadata,
      app_metadata: supabaseUser.app_metadata,
      prismaIsAdmin: userData.isAdmin,
      supabaseIsAdmin: isAdminFromSupabase,
      finalIsAdmin: isAdminFromSupabase || userData.isAdmin
    })

    return {
      id: userData.id,
      email: userData.email,
      isAdmin: isAdminFromSupabase || userData.isAdmin, // Check both sources
      role: roleFromSupabase,
      permissions: userData.permissions,
      plan: userData.plan,
      searches: userData.searches,
      createdAt: userData.createdAt,
      profile: userData.profile
    }
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function requireAuth(): Promise<User | null> {
  const user = await getUser()
  return user
}

export async function requireAdmin(): Promise<User | null> {
  const user = await requireAuth()
  
  if (!user || !user.isAdmin) {
    return null
  }
  
  return user
}

export async function getServerSession(request: NextRequest): Promise<User | null> {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get user data from Prisma
    const userData = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!userData) {
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      isAdmin: userData.isAdmin,
      role: userData.role,
      permissions: userData.permissions,
      plan: userData.plan,
      searches: userData.searches,
      createdAt: userData.createdAt,
      profile: userData.profile
    }
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}

export async function createOrUpdateUser(supabaseUser: any) {
  const userData = await prisma.user.upsert({
    where: { id: supabaseUser.id },
    update: {
      email: supabaseUser.email,
      updatedAt: new Date()
    },
    create: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      isAdmin: false,
      role: 'user',
      permissions: {},
      plan: 'free',
      searches: 0,
      profile: {}
    }
  })

  return userData
}

export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    // Update in Prisma database
    await prisma.user.update({
      where: { id: userId },
      data: {
        isAdmin,
        role: isAdmin ? 'admin' : 'user'
      }
    })

    // Update Supabase user metadata using admin client
    const adminClient = await createAdminClient()
    
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        isAdmin,
        role: isAdmin ? 'admin' : 'user'
      }
    })

    if (error) {
      console.error('Error updating Supabase user metadata:', error)
      return false
    }

    console.log(`Updated admin status for user ${userId}: isAdmin=${isAdmin}`)
    return true
  } catch (error) {
    console.error('Error updating user admin status:', error)
    return false
  }
}
