import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@bes.com';
  const password = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.usuario.upsert({
    where: { email },
    update: {
      rol: 'SUPER_ADMIN',
      password,
    },
    create: {
      email,
      password,
      nombres: 'Super',
      apellidos: 'Administrador',
      dni: '00000000',
      rol: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Super Admin creado con éxito:');
  console.log(`📧 Correo: ${admin.email}`);
  console.log(`🔑 Contraseña: admin123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
