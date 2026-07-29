import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Currency, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe-123456';
  const name = process.env.ADMIN_NAME ?? 'Administrador';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { name, passwordHash, active: true, role: 'ADMIN' },
    create: { email, name, passwordHash, role: 'ADMIN' },
  });

  const products = [
    {
      name: '100 Diamantes',
      description: 'Recarga básica para Free Fire.',
      diamonds: 100,
      bonusDiamonds: 0,
      salePrice: '4.50',
    },
    {
      name: '310 Diamantes',
      description: 'Paquete intermedio.',
      diamonds: 310,
      bonusDiamonds: 0,
      salePrice: '12.90',
    },
    {
      name: '520 Diamantes',
      description: 'Paquete popular.',
      diamonds: 520,
      bonusDiamonds: 0,
      salePrice: '20.50',
    },
  ];

  for (const item of products) {
    const existing = await prisma.product.findFirst({
      where: { diamonds: item.diamonds, bonusDiamonds: item.bonusDiamonds },
    });

    if (existing) continue;

    await prisma.product.create({
      data: {
        name: item.name,
        description: item.description,
        diamonds: item.diamonds,
        bonusDiamonds: item.bonusDiamonds,
        prices: {
          create: {
            currency: Currency.PEN,
            salePrice: item.salePrice,
          },
        },
      },
    });
  }

  console.log(`Administrador creado/actualizado: ${email}`);
  console.log('Productos iniciales cargados.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
