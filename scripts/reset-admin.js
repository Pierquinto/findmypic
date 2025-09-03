const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    console.log('🔄 Reset completo admin...\n');
    
    // Delete existing admin
    await prisma.user.deleteMany({
      where: { email: 'admin@findmypic.com' }
    });
    
    console.log('🗑️  Vecchio admin eliminato');
    
    // Create fresh admin
    const email = 'admin@findmypic.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    console.log('🔐 Nuovo hash password creato');
    console.log('Hash:', hashedPassword.substring(0, 30) + '...');
    
    const newAdmin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'admin',
        plan: 'pro',
        isActive: true,
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
    });
    
    console.log('✅ Nuovo admin creato!');
    console.log('ID:', newAdmin.id);
    console.log('Email:', newAdmin.email);
    console.log('Role:', newAdmin.role);
    
    // Verify immediately
    const testValid = await bcrypt.compare(password, hashedPassword);
    console.log('✅ Password verification:', testValid ? 'SUCCESS' : 'FAILED');
    
    console.log('\n🎯 CREDENZIALI ADMIN:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${password}`);
    console.log('🌐 URL: http://localhost:3000/login');
    console.log('\n⚡ PASSI SUCCESSIVI:');
    console.log('1. Riavvia il server Next.js (Ctrl+C poi npm run dev)');
    console.log('2. Vai su http://localhost:3000/logout');  
    console.log('3. Poi vai su http://localhost:3000/login');
    console.log('4. Usa le credenziali sopra');
    
  } catch (error) {
    console.error('❌ Errore:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();