import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anonKey || url === "YOUR_SUPABASE_URL_HERE") {
    console.warn('Supabase not configured, returning mock server client')
    // Return a mock client for development
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null })
      }
    } as any
  }

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  
  // Enhanced logging for debugging production issues
  console.log('[SUPABASE] Creating server client, cookies count:', allCookies.length)
  const authCookies = allCookies.filter(cookie => 
    cookie.name.includes('supabase') || cookie.name.includes('auth')
  )
  console.log('[SUPABASE] Auth-related cookies found:', authCookies.map(c => c.name))

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[SUPABASE] Setting cookie:', name, options)
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.log('[SUPABASE] Could not set cookies (Server Component):', error)
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey || url === "YOUR_SUPABASE_URL_HERE") {
    console.warn('Supabase admin not configured, returning mock admin client')
    // Return a mock admin client for development
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } })
      }
    } as any
  }

  const { createClient } = await import('@supabase/supabase-js')
  
  return createClient(
    url,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
