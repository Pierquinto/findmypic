import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

// Auth functions
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Server-side auth helpers
export async function getServerSession(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) return null
  return user
}

export async function requireAuth(request: Request) {
  const user = await getServerSession(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(request: Request) {
  const user = await getServerSession(request)
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  // Check if user is admin in database
  const { data: userData, error } = await supabase
    .from('users')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()
  
  if (error || !userData?.is_admin) {
    throw new Error('Forbidden: Admin access required')
  }
  
  return user
}