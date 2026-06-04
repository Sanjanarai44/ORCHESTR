import prisma from './src/config/prisma.js';

async function check() {
  const teams = await prisma.team.findMany({ select: { id: true, name: true, eventId: true, status: true } });
  console.log("Teams in DB:", teams);
  
  const events = await prisma.event.findMany({ select: { id: true, name: true } });
  console.log("Events in DB:", events);
}

check().catch(console.error).finally(() => process.exit(0));
