import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    console.log('[VERCEL-POSTGRES-TEST] Testing Vercel Supabase integration variables...')
    
    // Check which Postgres variables are available
    const postgresVars = {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
      POSTGRES_USER: !!process.env.POSTGRES_USER,
      POSTGRES_HOST: !!process.env.POSTGRES_HOST,
      POSTGRES_PASSWORD: !!process.env.POSTGRES_PASSWORD,
      POSTGRES_DATABASE: !!process.env.POSTGRES_DATABASE,
      DATABASE_URL: !!process.env.DATABASE_URL
    }
    
    console.log('[VERCEL-POSTGRES-TEST] Available variables:', postgresVars)
    
    // Show the connection strings (without passwords)
    const connectionStrings = {
      POSTGRES_URL: process.env.POSTGRES_URL?.replace(/:[^@]+@/, ':***@'),
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL?.replace(/:[^@]+@/, ':***@'),
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING?.replace(/:[^@]+@/, ':***@'),
      DATABASE_URL: process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@')
    }
    
    console.log('[VERCEL-POSTGRES-TEST] Connection strings:', connectionStrings)
    
    // Test the POSTGRES_PRISMA_URL specifically
    const testUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
    let databaseTest = { success: false, error: null, url: '', userCount: 0 }
    
    if (testUrl) {
      try {
        console.log('[VERCEL-POSTGRES-TEST] Testing connection with:', testUrl.replace(/:[^@]+@/, ':***@'))
        
        const { prisma } = await import('@/lib/prisma')
        await prisma.$connect()
        const userCount = await prisma.user.count()
        await prisma.$disconnect()
        
        console.log('[VERCEL-POSTGRES-TEST] Connection successful! User count:', userCount)
        
        databaseTest = {
          success: true,
          error: null,
          url: testUrl.replace(/:[^@]+@/, ':***@'),
          userCount
        }
        
      } catch (error) {
        console.error('[VERCEL-POSTGRES-TEST] Database test failed:', error)
        databaseTest = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          url: testUrl.replace(/:[^@]+@/, ':***@'),
          userCount: 0
        }
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercelIntegration: 'Supabase',
      availableVars: postgresVars,
      connectionStrings,
      databaseTest,
      recommendation: databaseTest.success ? 'Vercel Supabase integration working!' : 'Connection still failing'
    })
    
  } catch (error) {
    console.error('[VERCEL-POSTGRES-TEST] Critical error:', error)
    
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}