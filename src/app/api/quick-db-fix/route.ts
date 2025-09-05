import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    console.log('[QUICK-DB-FIX] Starting database connection test...')
    
    // Test the current DATABASE_URL environment variable
    const currentDbUrl = process.env.DATABASE_URL
    console.log('[QUICK-DB-FIX] Current DATABASE_URL:', currentDbUrl ? 'Set' : 'Not set')
    
    if (!currentDbUrl) {
      return NextResponse.json({
        error: 'DATABASE_URL environment variable is not set',
        fix: 'Set DATABASE_URL in Vercel dashboard and redeploy',
        timestamp: new Date().toISOString()
      })
    }
    
    // Hide password for logging
    const safeUrl = currentDbUrl.replace(/:[^@]+@/, ':***@')
    console.log('[QUICK-DB-FIX] Current URL format:', safeUrl)
    
    // Check if it still has pgbouncer
    const hasPgbouncer = currentDbUrl.includes('pgbouncer=true')
    const hasConnectionLimit = currentDbUrl.includes('connection_limit=')
    
    console.log('[QUICK-DB-FIX] Analysis:', {
      hasPgbouncer,
      hasConnectionLimit,
      needsUpdate: hasPgbouncer || hasConnectionLimit
    })
    
    if (hasPgbouncer || hasConnectionLimit) {
      return NextResponse.json({
        issue: 'DATABASE_URL still contains problematic parameters',
        current: safeUrl,
        recommended: 'postgresql://postgres:asdfer34qwe%24@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres',
        action: 'Update DATABASE_URL in Vercel dashboard and redeploy',
        timestamp: new Date().toISOString()
      })
    }
    
    // Try to connect with Prisma
    try {
      const { prisma } = await import('@/lib/prisma')
      console.log('[QUICK-DB-FIX] Testing Prisma connection...')
      
      await prisma.$connect()
      const userCount = await prisma.user.count()
      await prisma.$disconnect()
      
      console.log('[QUICK-DB-FIX] Connection successful!')
      
      return NextResponse.json({
        status: 'SUCCESS',
        message: 'Database connection working',
        userCount,
        currentUrl: safeUrl,
        timestamp: new Date().toISOString()
      })
      
    } catch (dbError) {
      console.error('[QUICK-DB-FIX] Database error:', dbError)
      
      return NextResponse.json({
        status: 'DATABASE_ERROR',
        error: dbError instanceof Error ? dbError.message : String(dbError),
        currentUrl: safeUrl,
        possibleFixes: [
          'Update DATABASE_URL to: postgresql://postgres:asdfer34qwe%24@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres',
          'Try pooled port: postgresql://postgres:asdfer34qwe%24@db.kxcenxzibosbtmedhjez.supabase.co:6543/postgres',
          'Check if Vercel has network restrictions'
        ],
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('[QUICK-DB-FIX] Critical error:', error)
    
    return NextResponse.json({
      status: 'CRITICAL_ERROR',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}