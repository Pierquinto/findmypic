const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

const prisma = new PrismaClient()

// Supabase client con service role key per operazioni admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variabili Supabase mancanti!')
  console.error('Assicurati di avere NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function createAdminUser(email, password = 'admin123') {
  try {
    console.log(`🆕 Creazione admin: ${email}`)
    
    // 1. Crea utente in Supabase
    console.log('📧 Creazione utente in Supabase...')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm per admin
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  Utente già esistente in Supabase, procedo con aggiornamento...')
        // Recupera l'utente esistente
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const user = existingUser.users.find(u => u.email === email)
        if (!user) {
          throw new Error('Utente non trovato in Supabase')
        }
        authData.user = user
      } else {
        throw authError
      }
    }

    console.log('✅ Utente creato/aggiornato in Supabase:', authData.user.email)

    // 2. Crea/aggiorna utente in Prisma
    console.log('🗄️  Creazione/aggiornamento in database...')
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        id: authData.user.id, // Sincronizza ID con Supabase
        isAdmin: true,
        role: 'admin',
        permissions: [
          'super_admin',
          'users:read',
          'users:write',
          'users:delete',
          'subscriptions:read',
          'subscriptions:write',
          'analytics:read',
          'system:read',
          'system:write',
          'search:config',
          'logs:read'
        ]
      },
      create: {
        id: authData.user.id, // Usa ID di Supabase
        email,
        password: 'supabase_managed', // Non usato con Supabase
        isAdmin: true,
        role: 'admin',
        plan: 'pro',
        permissions: [
          'super_admin',
          'users:read',
          'users:write',
          'users:delete',
          'subscriptions:read',
          'subscriptions:write',
          'analytics:read',
          'system:read',
          'system:write',
          'search:config',
          'logs:read'
        ]
      }
    })

    console.log('✅ Admin creato con successo!')
    console.log(`📧 Email: ${user.email}`)
    console.log(`🆔 ID: ${user.id}`)
    console.log(`🔑 Role: ${user.role}`)
    console.log(`⚙️  Permessi: ${user.permissions.length} permessi`)

  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function promoteToAdmin(email) {
  try {
    console.log(`📈 Promozione ad admin: ${email}`)
    
    // 1. Verifica che l'utente esista in Supabase
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const supabaseUser = users.users.find(u => u.email === email)
    
    if (!supabaseUser) {
      console.error(`❌ Utente ${email} non trovato in Supabase!`)
      console.log('💡 Usa "create" per creare un nuovo admin')
      return
    }

    // 2. Aggiorna ruolo in Prisma
    const user = await prisma.user.update({
      where: { email },
      data: {
        id: supabaseUser.id, // Sincronizza ID
        isAdmin: true,
        role: 'admin',
        permissions: [
          'users:read',
          'users:write',
          'subscriptions:read',
          'subscriptions:write',
          'analytics:read',
          'system:read',
          'system:write',
          'search:config',
          'logs:read'
        ]
      }
    })

    console.log('✅ Utente promosso ad admin!')
    console.log(`📧 Email: ${user.email}`)
    console.log(`🆔 ID: ${user.id}`)
    console.log(`🔑 Role: ${user.role}`)

  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Utente ${email} non trovato nel database!`)
    } else {
      console.error('❌ Errore:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { 
        OR: [
          { role: 'admin' },
          { isAdmin: true }
        ]
      },
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        isAdmin: true,
        createdAt: true
      }
    })

    console.log('\n👑 Lista Admin:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (admins.length === 0) {
      console.log('Nessun admin trovato')
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ${admin.email}`)
        console.log(`   🆔 ID: ${admin.id}`)
        console.log(`   🔑 Role: ${admin.role}`)
        console.log(`   👑 isAdmin: ${admin.isAdmin}`)
        console.log(`   ⚙️  Permessi: ${Array.isArray(admin.permissions) ? admin.permissions.length : 0}`)
        console.log(`   📅 Creato: ${admin.createdAt.toLocaleDateString('it-IT')}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function removeAdmin(email) {
  try {
    console.log(`📉 Rimozione admin: ${email}`)
    
    const user = await prisma.user.update({
      where: { email },
      data: {
        role: 'user',
        isAdmin: false,
        permissions: null
      }
    })

    console.log('✅ Ruolo admin rimosso!')
    console.log(`📧 Email: ${user.email}`)
    console.log(`🔑 Nuovo Role: ${user.role}`)

  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Utente ${email} non trovato!`)
    } else {
      console.error('❌ Errore:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function syncSupabaseUsers() {
  try {
    console.log('🔄 Sincronizzazione utenti Supabase...')
    
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    console.log(`📊 Trovati ${users.users.length} utenti in Supabase`)
    
    for (const supabaseUser of users.users) {
      const existingUser = await prisma.user.findUnique({
        where: { email: supabaseUser.email }
      })
      
      if (existingUser && existingUser.id !== supabaseUser.id) {
        console.log(`🔄 Sincronizzazione ID per ${supabaseUser.email}`)
        await prisma.user.update({
          where: { email: supabaseUser.email },
          data: { id: supabaseUser.id }
        })
      }
    }
    
    console.log('✅ Sincronizzazione completata!')

  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// CLI Interface
const command = process.argv[2]
const email = process.argv[3]
const password = process.argv[4]

async function main() {
  switch (command) {
    case 'create':
      if (!email) {
        console.error('❌ Email richiesta: node supabase-admin-manager.js create email@example.com [password]')
        return
      }
      await createAdminUser(email, password)
      break

    case 'promote':
      if (!email) {
        console.error('❌ Email richiesta: node supabase-admin-manager.js promote email@example.com')
        return
      }
      await promoteToAdmin(email)
      break

    case 'list':
      await listAdmins()
      break

    case 'remove':
      if (!email) {
        console.error('❌ Email richiesta: node supabase-admin-manager.js remove email@example.com')
        return
      }
      await removeAdmin(email)
      break

    case 'sync':
      await syncSupabaseUsers()
      break

    default:
      console.log('🛡️  FindMyPic Supabase Admin Manager')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Comandi disponibili:')
      console.log('')
      console.log('🆕 node supabase-admin-manager.js create <email> [password]  - Crea nuovo admin')
      console.log('📈 node supabase-admin-manager.js promote <email>            - Promuove utente esistente')
      console.log('📋 node supabase-admin-manager.js list                       - Lista tutti gli admin')
      console.log('📉 node supabase-admin-manager.js remove <email>             - Rimuove ruolo admin')
      console.log('🔄 node supabase-admin-manager.js sync                       - Sincronizza ID Supabase')
      console.log('')
      console.log('Esempi:')
      console.log('node supabase-admin-manager.js create admin@findmypic.com')
      console.log('node supabase-admin-manager.js promote user@findmypic.com')
      console.log('node supabase-admin-manager.js list')
      break
  }
}

main().catch(console.error)
