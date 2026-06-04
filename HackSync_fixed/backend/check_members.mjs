import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const members = await prisma.teamMember.findMany();
  console.log('Team Members:', members);
  const participants = await prisma.participant.findMany();
  console.log('Participants:', participants);
}
main().catch(console.error).finally(() => prisma.$disconnect());
