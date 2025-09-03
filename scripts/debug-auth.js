const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAuth() {
  try {
    console.log('🔍 Debug autenticazione...\n');
    
    // Check all users
    const allUsers = await prisma.user.findMany({
      select: { email: true, role: true, password: true }
    });
    
    console.log('👥 Tutti gli utenti nel database:');
    allUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email} (role: ${user.role || 'user'})`);
    });
    console.log('');
    
    // Test specific user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@findmypic.com' }
    });
    
    if (!adminUser) {
      console.log('❌ Utente admin@findmypic.com NON TROVATO');
      return;
    }
    
    console.log('✅ Utente admin@findmypic.com trovato:');
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('Password hash:', adminUser.password.substring(0, 30) + '...');
    console.log('');
    
    // Test password verification
    const testPassword = 'admin123';
    console.log(`🔐 Test password '${testPassword}':`);
    
    const isValid = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Risultato:', isValid ? '✅ PASSWORD CORRETTA' : '❌ PASSWORD SBAGLIATA');
    
    if (!isValid) {
      console.log('\n🔧 Ricreo la password...');
      const newHash = await bcrypt.hash(testPassword, 12);
      
      await prisma.user.update({
        where: { email: 'admin@findmypic.com' },
        data: { password: newHash }
      });
      
      console.log('✅ Password aggiornata, riprova il test...');
      
      const retestValid = await bcrypt.compare(testPassword, newHash);
      console.log('Nuovo test:', retestValid ? '✅ ORA FUNZIONA' : '❌ ANCORA PROBLEMI');
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();