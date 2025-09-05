'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type UserProfile = {
  id: string
  email: string
  isAdmin: boolean
  role: string
  permissions: any
  plan: string
  searches: number
  createdAt: string
  profile: any
}

type AuthContextType = {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  initialCheckDone: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  apiRequest: (url: string, options?: RequestInit) => Promise<Response>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialCheckDone, setInitialCheckDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if Supabase environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
      console.warn('Supabase not configured, using test user')
      // Set test user for development
      setUser({
        id: 'test-user-id',
        email: 'test@example.com',
        aud: 'authenticated',
        role: 'authenticated'
      } as any)
      setUserProfile({
        id: 'test-user-id',
        email: 'test@example.com',
        isAdmin: false,
        role: 'user',
        permissions: {},
        plan: 'free',
        searches: 0,
        createdAt: new Date().toISOString(),
        profile: {}
      })
      setLoading(false)
      setInitialCheckDone(true)
      return
    }

    // Check localStorage for cached auth state to show UI immediately
    const checkCachedAuth = () => {
      try {
        const cached = localStorage.getItem('supabase.auth.token')
        if (cached) {
          // We have a cached token, assume user is logged in until we verify
          const cachedData = JSON.parse(cached)
          if (cachedData && cachedData.access_token) {
            setInitialCheckDone(true)
            // We'll let the actual getSession call update the real state
          }
        } else {
          setInitialCheckDone(true)
        }
      } catch (error) {
        setInitialCheckDone(true)
      }
    }

    checkCachedAuth()

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        
        setUser(session?.user ?? null)
        setInitialCheckDone(true)
        
        if (session?.user) {
          // Fetch profile asynchronously without blocking
          fetchUserProfile(session.user)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setInitialCheckDone(true)
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          setUser(session?.user ?? null)
          
          if (session?.user) {
            // Don't wait for profile fetch to complete
            fetchUserProfile(session.user)
          } else {
            setUserProfile(null)
            setLoading(false)
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (user: User) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/user/profile', {
        credentials: 'include', // Ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && {
            'Authorization': `Bearer ${session.access_token}`
          })
        }
      })
      
      console.log('[AUTH] Profile fetch response:', response.status)
      
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
        console.log('[AUTH] Profile loaded successfully:', profile.email)
      } else {
        console.log('[AUTH] Profile fetch failed:', response.status, await response.text())
      }
      // Always set loading to false after profile fetch attempt
      setLoading(false)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Still set loading to false even on error
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error) {
      router.push('/dashboard')
    }
    
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (!error) {
      router.push('/login?message=Check your email to confirm your account')
    }
    
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const apiRequest = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    return fetch(url, {
      ...options,
      credentials: 'include', // Always include cookies for API requests
      headers
    })
  }

  const value = {
    user,
    userProfile,
    loading,
    initialCheckDone,
    signIn,
    signUp,
    signOut,
    apiRequest
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
