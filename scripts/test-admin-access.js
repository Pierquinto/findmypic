const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAdminAccess() {
  try {
    console.log('🔍 Test accesso admin...\n')
    
    // 1. Verifica utenti admin nel database
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
        isAdmin: true,
        permissions: true
      }
    })

    console.log('👑 Admin nel database:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (admins.length === 0) {
      console.log('❌ Nessun admin trovato!')
      return
    }

    admins.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.email}`)
      console.log(`   🆔 ID: ${admin.id}`)
      console.log(`   🔑 Role: ${admin.role}`)
      console.log(`   👑 isAdmin: ${admin.isAdmin}`)
      console.log(`   ⚙️  Permessi: ${Array.isArray(admin.permissions) ? admin.permissions.length : 0}`)
      
      // Verifica che abbia sia role che isAdmin
      const hasRole = admin.role === 'admin'
      const hasIsAdmin = admin.isAdmin === true
      
      if (hasRole && hasIsAdmin) {
        console.log(`   ✅ Status: ADMIN COMPLETO`)
      } else if (hasRole || hasIsAdmin) {
        console.log(`   ⚠️  Status: ADMIN PARZIALE (${hasRole ? 'role' : 'isAdmin'} mancante)`)
      } else {
        console.log(`   ❌ Status: NON ADMIN`)
      }
    })

    // 2. Test specifico per il tuo utente
    const yourUser = await prisma.user.findUnique({
      where: { email: 'pierquinto.manco@gmail.com' },
      select: {
        id: true,
        email: true,
        role: true,
        isAdmin: true,
        permissions: true
      }
    })

    if (yourUser) {
      console.log('\n🎯 Test utente specifico:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📧 Email: ${yourUser.email}`)
      console.log(`🆔 ID: ${yourUser.id}`)
      console.log(`🔑 Role: ${yourUser.role}`)
      console.log(`👑 isAdmin: ${yourUser.isAdmin}`)
      console.log(`⚙️  Permessi: ${Array.isArray(yourUser.permissions) ? yourUser.permissions.join(', ') : 'Nessuno'}`)
      
      const isAdmin = yourUser.role === 'admin' && yourUser.isAdmin === true
      console.log(`\n${isAdmin ? '✅' : '❌'} Accesso admin: ${isAdmin ? 'ABILITATO' : 'DISABILITATO'}`)
      
      if (!isAdmin) {
        console.log('\n🔧 Per abilitare l\'accesso admin:')
        console.log('node scripts/supabase-admin-manager.js promote pierquinto.manco@gmail.com')
      }
    } else {
      console.log('\n❌ Utente pierquinto.manco@gmail.com non trovato!')
    }

  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testAdminAccess()
