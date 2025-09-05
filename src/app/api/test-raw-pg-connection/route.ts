import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    console.log('[RAW-PG-TEST] Testing raw PostgreSQL connection...')
    
    // Try to use pg library directly instead of Prisma
    const { Client } = await import('pg')
    
    const testConfigs = [
      {
        name: 'Direct connection 5432',
        config: {
          host: 'db.kxcenxzibosbtmedhjez.supabase.co',
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password: 'asdfer34qwe$',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
          query_timeout: 5000,
        }
      },
      {
        name: 'Pooled connection 6543',
        config: {
          host: 'db.kxcenxzibosbtmedhjez.supabase.co',
          port: 6543,
          database: 'postgres',
          user: 'postgres',
          password: 'asdfer34qwe$',
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
          query_timeout: 5000,
        }
      }
    ]
    
    const results = []
    
    for (const test of testConfigs) {
      console.log(`[RAW-PG-TEST] Testing: ${test.name}`)
      
      const client = new Client(test.config)
      
      try {
        console.log(`[RAW-PG-TEST] Attempting to connect...`)
        await client.connect()
        console.log(`[RAW-PG-TEST] Connected successfully`)
        
        console.log(`[RAW-PG-TEST] Testing query...`)
        const result = await client.query('SELECT COUNT(*) as count FROM public."User"')
        console.log(`[RAW-PG-TEST] Query successful`)
        
        await client.end()
        
        results.push({
          name: test.name,
          success: true,
          userCount: result.rows[0].count
        })
        
      } catch (error) {
        console.error(`[RAW-PG-TEST] Error:`, error)
        
        try {
          await client.end()
        } catch (endError) {
          console.error(`[RAW-PG-TEST] End error:`, endError)
        }
        
        results.push({
          name: test.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          code: (error as any)?.code || 'UNKNOWN'
        })
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      results,
      networkTest: 'Raw PostgreSQL client test',
      recommendation: results.find(r => r.success) ? 'Connection working' : 'All connections failed'
    })
    
  } catch (importError) {
    console.error('[RAW-PG-TEST] Import error:', importError)
    
    return NextResponse.json({
      error: 'Could not import pg library',
      details: importError instanceof Error ? importError.message : String(importError),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}