const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function promoteToAdmin(email, permissions = []) {
  try {
    // Default admin permissions
    const defaultPermissions = [
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

    const userPermissions = permissions.length > 0 ? permissions : defaultPermissions

    const user = await prisma.user.update({
      where: { email },
      data: {
        role: 'admin',
        permissions: userPermissions
      }
    })

    console.log('✅ Utente promosso ad admin con successo:')
    console.log(`📧 Email: ${user.email}`)
    console.log(`🔑 Role: ${user.role}`)
    console.log(`⚙️  Permessi: ${userPermissions.join(', ')}`)

  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Errore: Utente con email "${email}" non trovato`)
    } else {
      console.error('❌ Errore durante la promozione:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function createSuperAdmin(email, permissions = []) {
  try {
    const superAdminPermissions = [
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

    const userPermissions = permissions.length > 0 ? permissions : superAdminPermissions

    const user = await prisma.user.update({
      where: { email },
      data: {
        role: 'admin',
        permissions: userPermissions
      }
    })

    console.log('✅ Super Admin creato con successo:')
    console.log(`📧 Email: ${user.email}`)
    console.log(`🔑 Role: ${user.role}`)
    console.log(`⚙️  Permessi: ${userPermissions.join(', ')}`)

  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Errore: Utente con email "${email}" non trovato`)
    } else {
      console.error('❌ Errore durante la creazione del super admin:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true
      }
    })

    console.log('\n👑 Lista Admin attuali:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (admins.length === 0) {
      console.log('Nessun admin trovato')
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ${admin.email}`)
        console.log(`   ID: ${admin.id}`)
        console.log(`   Role: ${admin.role}`)
        console.log(`   Permessi: ${Array.isArray(admin.permissions) ? admin.permissions.join(', ') : 'Nessuno'}`)
        console.log(`   Creato: ${admin.createdAt.toLocaleDateString('it-IT')}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore nel recuperare gli admin:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function removeAdmin(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: {
        role: 'user',
        permissions: null
      }
    })

    console.log('✅ Ruolo admin rimosso con successo:')
    console.log(`📧 Email: ${user.email}`)
    console.log(`🔑 Nuovo Role: ${user.role}`)

  } catch (error) {
    if (error.code === 'P2025') {
      console.error(`❌ Errore: Utente con email "${email}" non trovato`)
    } else {
      console.error('❌ Errore durante la rimozione:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// CLI Interface
const command = process.argv[2]
const email = process.argv[3]

async function main() {
  switch (command) {
    case 'promote':
      if (!email) {
        console.error('❌ Email richiesta: node promote-admin.js promote user@example.com')
        return
      }
      await promoteToAdmin(email)
      break

    case 'super':
      if (!email) {
        console.error('❌ Email richiesta: node promote-admin.js super user@example.com')
        return
      }
      await createSuperAdmin(email)
      break

    case 'list':
      await listAdmins()
      break

    case 'remove':
      if (!email) {
        console.error('❌ Email richiesta: node promote-admin.js remove user@example.com')
        return
      }
      await removeAdmin(email)
      break

    default:
      console.log('🛡️  FindMyPic Admin Manager')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Comandi disponibili:')
      console.log('')
      console.log('📈 node promote-admin.js promote <email>  - Promuove utente ad admin')
      console.log('👑 node promote-admin.js super <email>    - Crea super admin')
      console.log('📋 node promote-admin.js list             - Lista tutti gli admin')
      console.log('📉 node promote-admin.js remove <email>   - Rimuove ruolo admin')
      console.log('')
      console.log('Esempi:')
      console.log('node promote-admin.js promote admin@findmypic.com')
      console.log('node promote-admin.js super owner@findmypic.com')
      break
  }
}

main().catch(console.error)