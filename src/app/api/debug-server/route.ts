import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const debug = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
    supabase: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
    },
    database: {
      url: !!process.env.DATABASE_URL ? 'Set' : 'Missing',
      connection: 'Testing...'
    },
    other: {
      googleVisionKey: !!process.env.GOOGLE_VISION_API_KEY ? 'Set' : 'Missing',
      r2AccessKey: !!process.env.R2_ACCESS_KEY_ID ? 'Set' : 'Missing',
      r2SecretKey: !!process.env.R2_SECRET_ACCESS_KEY ? 'Set' : 'Missing',
    }
  }

  try {
    // Test database connection
    await prisma.$connect()
    const userCount = await prisma.user.count()
    debug.database.connection = `Connected - ${userCount} users found`
  } catch (error) {
    debug.database.connection = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }

  try {
    // Test Supabase connection
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error) {
      debug.supabase.connection = `Error: ${error.message}`
    } else {
      debug.supabase.connection = `Connected - ${data.users.length} users found`
    }
  } catch (error) {
    debug.supabase.connection = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }

  return NextResponse.json(debug, { status: 200 })
}
