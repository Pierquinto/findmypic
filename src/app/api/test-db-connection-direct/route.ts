import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET(req: NextRequest) {
  const testConnections = [
    {
      name: "Current DATABASE_URL from env",
      url: process.env.DATABASE_URL
    },
    {
      name: "Direct connection (no pgbouncer)",
      url: "postgresql://postgres:asdfer34qwe%24@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres"
    },
    {
      name: "Pooled port 6543",
      url: "postgresql://postgres:asdfer34qwe%24@db.kxcenxzibosbtmedhjez.supabase.co:6543/postgres"
    },
    {
      name: "Direct with timeout",
      url: "postgresql://postgres:asdfer34qwe%24@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres?connect_timeout=15"
    }
  ]
  
  const results = []
  
  for (const test of testConnections) {
    console.log(`[DB-TEST] Testing: ${test.name}`)
    
    if (!test.url) {
      results.push({
        name: test.name,
        success: false,
        error: "URL is undefined"
      })
      continue
    }
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: test.url }
      },
      log: ['error']
    })
    
    try {
      console.log(`[DB-TEST] Attempting connection...`)
      await prisma.$connect()
      console.log(`[DB-TEST] Connection successful`)
      
      const userCount = await prisma.user.count()
      console.log(`[DB-TEST] Query successful - User count: ${userCount}`)
      
      await prisma.$disconnect()
      
      results.push({
        name: test.name,
        success: true,
        userCount,
        url: test.url.replace(/:[^@]+@/, ':***@') // Hide password in logs
      })
      
    } catch (error) {
      console.error(`[DB-TEST] Error:`, error)
      
      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        console.error(`[DB-TEST] Disconnect error:`, disconnectError)
      }
      
      results.push({
        name: test.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        url: test.url.replace(/:[^@]+@/, ':***@') // Hide password in logs
      })
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    results,
    recommendation: results.find(r => r.success)?.name || "No successful connection found"
  })
}