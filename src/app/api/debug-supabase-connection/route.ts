import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    console.log('[SUPABASE-DEBUG] Starting Supabase connection test...')
    
    // Test 1: Environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[SUPABASE-DEBUG] Environment check:', { hasUrl, hasAnonKey, hasServiceKey })
    
    // Test 2: Regular client creation
    let regularClientTest = { success: false, error: null }
    try {
      const supabase = await createClient()
      console.log('[SUPABASE-DEBUG] Regular client created successfully')
      regularClientTest.success = true
    } catch (error) {
      console.error('[SUPABASE-DEBUG] Regular client creation failed:', error)
      regularClientTest.error = error instanceof Error ? error.message : String(error)
    }
    
    // Test 3: Admin client creation
    let adminClientTest = { success: false, error: null, canGetUser: false }
    try {
      const adminClient = await createAdminClient()
      console.log('[SUPABASE-DEBUG] Admin client created successfully')
      adminClientTest.success = true
      
      // Test if we can use admin client to get user info
      try {
        // Try to get a test token from request headers
        const authHeader = req.headers.get('authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '')
          const { data: { user }, error } = await adminClient.auth.getUser(token)
          
          if (error) {
            console.log('[SUPABASE-DEBUG] Admin client token validation failed:', error.message)
            adminClientTest.canGetUser = false
          } else {
            console.log('[SUPABASE-DEBUG] Admin client token validation SUCCESS for user:', user?.email)
            adminClientTest.canGetUser = true
          }
        }
      } catch (userError) {
        console.error('[SUPABASE-DEBUG] Admin client user test failed:', userError)
        adminClientTest.canGetUser = false
      }
      
    } catch (error) {
      console.error('[SUPABASE-DEBUG] Admin client creation failed:', error)
      adminClientTest.error = error instanceof Error ? error.message : String(error)
    }
    
    // Test 4: Database connection via Prisma
    let databaseTest = { success: false, error: null }
    try {
      const { prisma } = await import('@/lib/prisma')
      const userCount = await prisma.user.count()
      console.log('[SUPABASE-DEBUG] Database connection successful, user count:', userCount)
      databaseTest.success = true
    } catch (error) {
      console.error('[SUPABASE-DEBUG] Database connection failed:', error)
      databaseTest.error = error instanceof Error ? error.message : String(error)
    }
    
    const result = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tests: {
        environment: { hasUrl, hasAnonKey, hasServiceKey },
        regularClient: regularClientTest,
        adminClient: adminClientTest,
        database: databaseTest
      }
    }
    
    console.log('[SUPABASE-DEBUG] Test results:', JSON.stringify(result, null, 2))
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('[SUPABASE-DEBUG] Critical error:', error)
    return NextResponse.json({
      error: 'Critical test failure',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Test with a provided token
    const { token } = await req.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    
    console.log(`[SUPABASE-DEBUG] Testing token validation: ${token.substring(0, 20)}...`)
    
    const adminClient = await createAdminClient()
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    
    if (error) {
      console.log('[SUPABASE-DEBUG] Token validation failed:', error.message)
      return NextResponse.json({
        valid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
    
    console.log('[SUPABASE-DEBUG] Token validation SUCCESS for user:', user?.email)
    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[SUPABASE-DEBUG] POST error:', error)
    return NextResponse.json({
      error: 'Token validation failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}