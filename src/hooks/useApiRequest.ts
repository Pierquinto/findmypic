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
    
    // If we have a user, try to add the auth token
    if (user && typeof window !== 'undefined') {
      try {
        // Get fresh session from localStorage or Supabase
        const supabaseSession = localStorage.getItem('supabase.auth.token')
        if (supabaseSession) {
          const parsed = JSON.parse(supabaseSession)
          if (parsed.access_token) {
            defaultOptions.headers = {
              ...defaultOptions.headers,
              'Authorization': `Bearer ${parsed.access_token}`
            }
          }
        }
      } catch (error) {
        console.warn('Could not get auth token from localStorage:', error)
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
      credentials: mergedOptions.credentials
    })
    
    return fetch(url, mergedOptions)
  }, [user])
  
  return apiRequest
}