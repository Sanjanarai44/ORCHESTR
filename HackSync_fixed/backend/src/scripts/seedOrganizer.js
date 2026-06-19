import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  await prisma.organizer.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      name: 'Event Admin',
      email: 'admin@wiseti.com',
      password: hashed,
      authProvider: 'email',
    },
  });
  console.log('Seeded organizer id=1 (admin@wiseti.com / admin123)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());