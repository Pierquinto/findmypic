import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user (password managed by Supabase)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@findmypic.com' },
    update: {},
    create: {
      id: 'admin-user-id', // Fixed ID for Supabase compatibility
      email: 'admin@findmypic.com',
      password: 'supabase-managed', // Placeholder, Supabase handles auth
      plan: 'pro',
      role: 'admin',
      isAdmin: true,
      isActive: true,
      searches: 0,
    }
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Create test user (password managed by Supabase)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@findmypic.com' },
    update: {},
    create: {
      id: 'test-user-id', // Fixed ID for Supabase compatibility
      email: 'test@findmypic.com', 
      password: 'supabase-managed', // Placeholder, Supabase handles auth
      plan: 'free',
      role: 'user',
      isAdmin: false,
      isActive: true,
      searches: 0,
    }
  })

  console.log('✅ Test user created:', testUser.email)
  
  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })