#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createAdmin(email, password) {
  try {
    console.log(`Creating admin user: ${email}`)
    
    // Create user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (authError) {
      console.error('Error creating user in Supabase:', authError.message)
      return
    }
    
    // Create user in Prisma with admin privileges
    const user = await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        isAdmin: true,
        role: 'admin',
        permissions: { admin: true }
      },
      create: {
        id: authData.user.id,
        email: authData.user.email,
        isAdmin: true,
        role: 'admin',
        permissions: { admin: true },
        plan: 'admin',
        searches: 0,
        profile: {}
      }
    })
    
    console.log(`✅ Admin user created successfully: ${email}`)
    console.log(`User ID: ${user.id}`)
    
  } catch (error) {
    console.error('Error creating admin:', error.message)
  }
}

async function promoteToAdmin(email) {
  try {
    console.log(`Promoting user to admin: ${email}`)
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.error(`❌ User not found: ${email}`)
      return
    }
    
    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isAdmin: true,
        role: 'admin',
        permissions: { admin: true }
      }
    })
    
    console.log(`✅ User promoted to admin: ${email}`)
    
  } catch (error) {
    console.error('Error promoting user:', error.message)
  }
}

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    })
    
    console.log('\n📋 Admin Users:')
    console.log('================')
    
    if (admins.length === 0) {
      console.log('No admin users found.')
    } else {
      admins.forEach(admin => {
        console.log(`Email: ${admin.email}`)
        console.log(`Role: ${admin.role}`)
        console.log(`Created: ${admin.createdAt}`)
        console.log('---')
      })
    }
    
  } catch (error) {
    console.error('Error listing admins:', error.message)
  }
}

async function removeAdmin(email) {
  try {
    console.log(`Removing admin privileges from: ${email}`)
    
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.error(`❌ User not found: ${email}`)
      return
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isAdmin: false,
        role: 'user',
        permissions: {}
      }
    })
    
    console.log(`✅ Admin privileges removed from: ${email}`)
    
  } catch (error) {
    console.error('Error removing admin:', error.message)
  }
}

// CLI interface
const command = process.argv[2]
const email = process.argv[3]
const password = process.argv[4]

async function main() {
  switch (command) {
    case 'create':
      if (!email || !password) {
        console.log('Usage: node admin-manager.js create <email> <password>')
        process.exit(1)
      }
      await createAdmin(email, password)
      break
      
    case 'promote':
      if (!email) {
        console.log('Usage: node admin-manager.js promote <email>')
        process.exit(1)
      }
      await promoteToAdmin(email)
      break
      
    case 'list':
      await listAdmins()
      break
      
    case 'remove':
      if (!email) {
        console.log('Usage: node admin-manager.js remove <email>')
        process.exit(1)
      }
      await removeAdmin(email)
      break
      
    default:
      console.log('Admin Manager - Supabase + Prisma')
      console.log('==================================')
      console.log('Commands:')
      console.log('  create <email> <password>  - Create new admin user')
      console.log('  promote <email>            - Promote existing user to admin')
      console.log('  list                       - List all admin users')
      console.log('  remove <email>             - Remove admin privileges')
      break
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)
