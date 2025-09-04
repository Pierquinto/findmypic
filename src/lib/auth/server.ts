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
    
    // Try to get user from Authorization header first
    const headersList = await headers()
    const authorization = headersList.get('authorization')
    
    let supabaseUser = null
    
    if (authorization && authorization.startsWith('Bearer ')) {
      // Create admin client for token verification
      const adminClient = await createAdminClient()
      const token = authorization.replace('Bearer ', '')
      
      try {
        const { data: { user }, error } = await adminClient.auth.getUser(token)
        if (!error && user) {
          supabaseUser = user
        }
      } catch (tokenError) {
        console.error('Error verifying token:', tokenError)
      }
    }
    
    // Fallback to cookies if no valid Authorization header
    if (!supabaseUser) {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        return null
      }
      supabaseUser = user
    }

    // Get user data from Prisma
    const userData = await prisma.user.findUnique({
      where: { id: supabaseUser.id }
    })

    if (!userData) {
      // Create user if doesn't exist
      const newUser = await createOrUpdateUser(supabaseUser)
      return {
        id: newUser.id,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        role: newUser.role,
        permissions: newUser.permissions,
        plan: newUser.plan,
        searches: newUser.searches,
        createdAt: newUser.createdAt,
        profile: newUser.profile
      }
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
