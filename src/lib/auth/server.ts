import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

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
    console.error('Error getting user:', error)
    return null
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireAuth()
  
  if (!user.isAdmin) {
    redirect('/dashboard')
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
