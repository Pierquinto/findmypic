'use client'

export async function debugAuthState() {
  if (typeof window === 'undefined') return

  console.log('[CLIENT-DEBUG] Starting authentication state debug...')
  
  // Check localStorage for all keys
  const localStorageKeys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) localStorageKeys.push(key)
  }
  
  console.log('[CLIENT-DEBUG] All localStorage keys:', localStorageKeys)
  
  // Check specifically for Supabase-related keys
  const supabaseKeys = localStorageKeys.filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('sb-')
  )
  
  console.log('[CLIENT-DEBUG] Supabase-related keys:', supabaseKeys)
  
  // Check values of Supabase keys (safely)
  const supabaseData: Record<string, any> = {}
  supabaseKeys.forEach(key => {
    try {
      const value = localStorage.getItem(key)
      const parsed = value ? JSON.parse(value) : value
      supabaseData[key] = {
        hasValue: !!value,
        type: typeof parsed,
        hasAccessToken: !!parsed?.access_token,
        hasSession: !!parsed?.session,
        sessionHasToken: !!parsed?.session?.access_token
      }
    } catch (error) {
      supabaseData[key] = { error: 'Could not parse' }
    }
  })
  
  console.log('[CLIENT-DEBUG] Supabase data analysis:', supabaseData)
  
  // Try to get session from Supabase client
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.log('[CLIENT-DEBUG] Supabase client session:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.access_token,
      userEmail: session?.user?.email,
      error: error?.message
    })
  } catch (error) {
    console.error('[CLIENT-DEBUG] Error getting Supabase session:', error)
  }
  
  // Check cookies
  const cookies = document.cookie
    .split('; ')
    .map(cookie => {
      const [name] = cookie.split('=')
      return name
    })
    .filter(name => name.includes('supabase') || name.includes('auth') || name.includes('sb-'))
  
  console.log('[CLIENT-DEBUG] Auth-related cookies:', cookies)
  
  // Send debug data to server
  const debugData = {
    timestamp: new Date().toISOString(),
    localStorageKeys,
    supabaseKeys,
    supabaseData,
    cookies,
    userAgent: navigator.userAgent,
    url: window.location.href
  }
  
  try {
    await fetch('/api/debug-client-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debugData)
    })
    console.log('[CLIENT-DEBUG] Debug data sent to server')
  } catch (error) {
    console.error('[CLIENT-DEBUG] Failed to send debug data:', error)
  }
  
  return debugData
}