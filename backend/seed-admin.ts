import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt'; // Usamos bcrypt que instalamos en BES

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
      nombre: 'Super Administrador',
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
