const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testLogin() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: 'demo@demo.com' } 
    });
    
    if (!user) {
      console.log('❌ Utente non trovato');
      return;
    }
    
    console.log('🔍 Test password per demo@demo.com:');
    console.log('Role:', user.role);
    console.log('Permissions:', user.permissions);
    
    const passwords = ['demo', 'password', '123456', 'admin'];
    
    for (const pwd of passwords) {
      const isValid = await bcrypt.compare(pwd, user.password);
      console.log(`Password '${pwd}': ${isValid ? '✅ CORRETTA' : '❌ Sbagliata'}`);
    }
    
  } catch (error) {
    console.error('Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();