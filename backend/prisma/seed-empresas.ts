import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Configuración de encriptación (debe coincidir con la del backend)
const ENCRYPTION_KEY = "12345678901234567890123456789012"; // 32 chars
const IV_LENGTH = 16;

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function main() {
  console.log('--- Iniciando Carga Masiva de Empresas ---');

  // 1. Obtener el primer usuario (dueño de las empresas)
  const user = await prisma.usuario.findFirst();
  if (!user) {
    console.error('ERROR: No se encontró ningún usuario en la DB. Crea un usuario primero.');
    return;
  }

  const empresas = [
    { razonSocial: 'JADAMI S.A.C.', ruc: '20551902910', usuarioSol: 'ISTOCLIA', claveSol: 'Jadami123' },
    { razonSocial: "PARADA 90'S S.R.L.", ruc: '20609648300', usuarioSol: '45032279', claveSol: 'Parada123' },
    { razonSocial: 'ARYP SERVICIOS GENERALES E.I.R.L.', ruc: '20614898870', usuarioSol: '61025533', claveSol: 'Reyes123' },
    { razonSocial: 'KRICASA E.I.R.L.', ruc: '20612668320', usuarioSol: '43575764', claveSol: 'Kricasa2025' },
    { razonSocial: 'PASANNI S.R.L.', ruc: '20600615140', usuarioSol: 'PASSANNI', claveSol: 'PASANNIWGC' },
    { razonSocial: 'MEJIAS PEREZ ABRAHAN ENRIQUE', ruc: '15614447220', usuarioSol: 'EUREQUAY', claveSol: 'Mejias81' },
    { razonSocial: 'ENTRECOSTILLAS E.I.R.L.', ruc: '20607426211', usuarioSol: '45441646', claveSol: 'ECostillas01' },
    { razonSocial: 'SERVICIOS MULTIPLES J A HERMANOS S.R.L.', ruc: '20600938551', usuarioSol: 'JAHERMAN', claveSol: 'JaHerm01' },
    { razonSocial: 'SERVICIOS GENERALES INGMER S.A.C.', ruc: '20614544491', usuarioSol: '18866982', claveSol: '1085Ingemer' },
    { razonSocial: 'FAST DENTAL ESTHETIC E.I.R.L.', ruc: '20610331581', usuarioSol: '70136474', claveSol: 'Stefano27F' },
    { razonSocial: 'TEG&T TECNICOS ESPECIALISTAS EN GEOSINTETICOS S.A.C.', ruc: '20606249081', usuarioSol: 'AIRGINOT', claveSol: '48208375Cris' },
  ];

  let creadas = 0;
  for (const emp of empresas) {
    try {
      await prisma.empresa.upsert({
        where: { ruc: emp.ruc },
        update: {
          razonSocial: emp.razonSocial,
          usuarioSol: emp.usuarioSol,
          claveSol: encrypt(emp.claveSol),
          usuarioId: user.id
        },
        create: {
          razonSocial: emp.razonSocial,
          ruc: emp.ruc,
          usuarioSol: emp.usuarioSol,
          claveSol: encrypt(emp.claveSol),
          usuarioId: user.id
        }
      });
      console.log(`✅ Procesada: ${emp.razonSocial}`);
      creadas++;
    } catch (err) {
      console.error(`❌ Error con ${emp.ruc}:`, err.message);
    }
  }

  console.log(`\n--- Proceso finalizado. Total: ${creadas} empresas ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
