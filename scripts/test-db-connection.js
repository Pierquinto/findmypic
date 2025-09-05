#!/usr/bin/env node

/**
 * Test script to verify database connectivity with different connection string formats
 * Run with: node scripts/test-db-connection.js
 */

const { PrismaClient } = require('@prisma/client')

// Test different connection string formats
const connectionTests = [
  {
    name: 'Direct Connection (no pgbouncer)',
    url: 'postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres'
  },
  {
    name: 'Connection Pooling (pgbouncer)',
    url: 'postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1'
  },
  {
    name: 'Pooled Port (6543)',
    url: 'postgresql://postgres:asdfer34qwe$@db.kxcenxzibosbtmedhjez.supabase.co:6543/postgres'
  }
]

async function testConnection(name, url) {
  console.log(`\n=== Testing: ${name} ===`)
  console.log(`URL: ${url.replace(/:[^@]+@/, ':***@')}`) // Hide password
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    },
    log: ['error']
  })
  
  try {
    // Test basic connection
    console.log('1. Testing database connection...')
    await prisma.$connect()
    console.log('✅ Connection successful')
    
    // Test query execution
    console.log('2. Testing query execution...')
    const userCount = await prisma.user.count()
    console.log(`✅ Query successful - User count: ${userCount}`)
    
    // Test connection close
    console.log('3. Testing connection close...')
    await prisma.$disconnect()
    console.log('✅ Disconnect successful')
    
    return { success: true, userCount }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    
    try {
      await prisma.$disconnect()
    } catch (disconnectError) {
      console.log(`❌ Disconnect error: ${disconnectError.message}`)
    }
    
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🔍 Database Connection Test Suite')
  console.log('================================')
  
  const results = []
  
  for (const test of connectionTests) {
    const result = await testConnection(test.name, test.url)
    results.push({ ...test, ...result })
  }
  
  console.log('\n📊 RESULTS SUMMARY')
  console.log('=================')
  
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${index + 1}. ${result.name}: ${status}`)
    if (result.success) {
      console.log(`   Users in database: ${result.userCount}`)
    } else {
      console.log(`   Error: ${result.error}`)
    }
  })
  
  const successfulTests = results.filter(r => r.success)
  if (successfulTests.length > 0) {
    console.log(`\n🎉 Recommended configuration: ${successfulTests[0].name}`)
    console.log(`   URL format: ${successfulTests[0].url.replace(/:[^@]+@/, ':YOUR_PASSWORD@')}`)
  } else {
    console.log('\n💥 All connection tests failed. Check your credentials and network connectivity.')
  }
}

runTests().catch(console.error)