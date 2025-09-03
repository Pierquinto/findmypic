const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugAdminFrontend() {
  try {
    console.log('🔍 Debug frontend admin...\n')
    
    // 1. Verifica utente admin
    const admin = await prisma.user.findUnique({
      where: { email: 'pierquinto.manco@gmail.com' },
      select: {
        id: true,
        email: true,
        role: true,
        isAdmin: true,
        permissions: true
      }
    })

    if (!admin) {
      console.log('❌ Utente admin non trovato!')
      return
    }

    console.log('👑 Utente admin:')
    console.log(`📧 Email: ${admin.email}`)
    console.log(`🆔 ID: ${admin.id}`)
    console.log(`🔑 Role: ${admin.role}`)
    console.log(`👑 isAdmin: ${admin.isAdmin}`)
    console.log(`⚙️  Permessi: ${Array.isArray(admin.permissions) ? admin.permissions.length : 0}`)

    // 2. Simula chiamata API
    console.log('\n🌐 Test API /api/user/profile:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const expectedResponse = {
      id: admin.id,
      email: admin.email,
      plan: 'pro',
      searches: 0,
      createdAt: new Date(),
      isAdmin: admin.isAdmin,
      role: admin.role,
      permissions: admin.permissions,
      profile: null
    }

    console.log('📤 Risposta API attesa:')
    console.log(JSON.stringify(expectedResponse, null, 2))

    // 3. Verifica che isAdmin sia true
    if (admin.isAdmin === true) {
      console.log('\n✅ isAdmin è true - il frontend dovrebbe mostrare il link admin')
    } else {
      console.log('\n❌ isAdmin è false - il frontend NON mostrerà il link admin')
    }

    // 4. Istruzioni per il test
    console.log('\n🧪 Test manuale:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('1. Vai su http://localhost:3000/login')
    console.log('2. Login con pierquinto.manco@gmail.com')
    console.log('3. Clicca sul menu utente (avatar in alto a destra)')
    console.log('4. Dovresti vedere "Admin Panel" in rosso')
    console.log('5. Clicca su "Admin Panel" per andare su /admin')
    console.log('')
    console.log('🔧 Se non funziona:')
    console.log('- Apri DevTools (F12)')
    console.log('- Vai su Console')
    console.log('- Cerca errori o log di debug')
    console.log('- Verifica che /api/user/profile restituisca isAdmin: true')

  } catch (error) {
    console.error('❌ Errore:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

debugAdminFrontend()
