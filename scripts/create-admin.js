const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = 'admin@findmypic.com';
    const password = 'admin123';
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingAdmin) {
      console.log(`⚠️  Admin ${email} già esistente. Aggiornamento password...`);
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
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
        }
      });
      
      console.log('✅ Admin aggiornato con successo!');
    } else {
      console.log(`🆕 Creazione nuovo admin: ${email}`);
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const newAdmin = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
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
      });
      
      console.log('✅ Admin creato con successo!');
    }
    
    console.log('');
    console.log('🔑 Credenziali admin:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${password}`);
    console.log('🌐 Login URL: http://localhost:3000/login');
    console.log('🛡️  Admin Panel: http://localhost:3000/admin');
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambia questa password in produzione!');
    
  } catch (error) {
    console.error('❌ Errore durante la creazione admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();