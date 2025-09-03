import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      )
    }
    
    console.log('DATABASE_URL configured:', process.env.DATABASE_URL.substring(0, 30) + '...')
    
    // Test connection
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Test simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('Test query result:', result)
    
    // Check if users table exists
    const userCount = await prisma.user.count()
    console.log('User table accessible, count:', userCount)
    
    return NextResponse.json({
      success: true,
      database_url_configured: !!process.env.DATABASE_URL,
      connection_test: 'success',
      users_count: userCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      database_url_configured: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString()
    }, { status: 500 })
    
  } finally {
    await prisma.$disconnect()
  }
}