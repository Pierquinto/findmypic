'use client'

import { useAuth } from '@/lib/auth/client'
import { useCallback } from 'react'

export function useApiRequest() {
  const { user } = useAuth()
  
  const apiRequest = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    // Ensure we always include credentials (cookies)
    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
    
    // If we have a user, try to add the auth token from Supabase client
    if (user && typeof window !== 'undefined') {
      try {
        // Try multiple approaches to get the token
        let accessToken = null
        
        // Method 1: Check localStorage with different possible keys
        const possibleKeys = [
          'supabase.auth.token',
          'sb-kxcenxzibosbtmedhjez-auth-token',
          'sb-auth-token'
        ]
        
        for (const key of possibleKeys) {
          const stored = localStorage.getItem(key)
          if (stored) {
            const parsed = JSON.parse(stored)
            if (parsed.access_token) {
              accessToken = parsed.access_token
              console.log(`[API] Found token in localStorage key: ${key}`)
              break
            } else if (parsed.session?.access_token) {
              accessToken = parsed.session.access_token
              console.log(`[API] Found token in session from key: ${key}`)
              break
            }
          }
        }
        
        // Method 2: Try to get from Supabase client directly
        if (!accessToken) {
          try {
            // Import and use Supabase client
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) {
              accessToken = session.access_token
              console.log('[API] Found token from Supabase client session')
            }
          } catch (clientError) {
            console.warn('[API] Could not get session from Supabase client:', clientError)
          }
        }
        
        if (accessToken) {
          defaultOptions.headers = {
            ...defaultOptions.headers,
            'Authorization': `Bearer ${accessToken}`
          }
          console.log(`[API] Added Authorization header with token: ${accessToken.substring(0, 20)}...`)
        } else {
          console.warn('[API] No access token found through any method')
        }
        
      } catch (error) {
        console.warn('Could not get auth token:', error)
      }
    }
    
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    }
    
    console.log(`[API] ${options.method || 'GET'} ${url}`, {
      hasAuth: !!mergedOptions.headers?.['Authorization'],
      credentials: mergedOptions.credentials,
      authHeader: mergedOptions.headers?.['Authorization'] ? 'Bearer ***' : 'Missing',
      allHeaders: Object.keys(mergedOptions.headers || {})
    })
    
    return fetch(url, mergedOptions)
  }, [user])
  
  return apiRequest
}