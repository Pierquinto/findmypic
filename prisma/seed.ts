import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@findmypic.com',
      password: hashedPassword,
      plan: 'pro',
      role: 'admin',
      isAdmin: true,
      isActive: true,
      searches: 0,
    }
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Create test user
  const testUserPassword = await bcrypt.hash('test123', 12)
  const testUser = await prisma.user.create({
    data: {
      email: 'test@findmypic.com', 
      password: testUserPassword,
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