import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const judges = await prisma.judge.findMany();
  console.log(judges);
}
run().finally(() => prisma.$disconnect());
