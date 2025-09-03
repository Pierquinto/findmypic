import { prisma } from '../src/lib/prisma'
import { supabase } from '../src/lib/supabase'

async function createAdminUser() {
  const adminEmail = 'admin@example.com'
  const adminPassword = 'admin123'
  
  try {
    // First, try to create user in Supabase
    console.log('Creating admin user in Supabase...')
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
    })

    if (error) {
      console.log('Supabase signup error (user might already exist):', error.message)
    } else {
      console.log('Supabase user created:', data.user?.email)
    }

    // Create or update user in Prisma database
    console.log('Creating/updating admin user in database...')
    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        isAdmin: true,
        role: 'admin',
        plan: 'pro'
      },
      create: {
        id: data?.user?.id || 'admin-id-fallback',
        email: adminEmail,
        password: 'hashed_password_placeholder', // Not used with Supabase
        isAdmin: true,
        role: 'admin',
        plan: 'pro'
      }
    })

    console.log('Admin user created/updated:', {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role
    })

  } catch (error) {
    console.error('Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()