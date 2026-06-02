import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.emailLog.findMany({orderBy:{createdAt:'desc'},take:1});
  console.log(logs);
}
run().finally(() => prisma.$disconnect());
