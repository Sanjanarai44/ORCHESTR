import prisma from './src/config/prisma.js';

async function check() {
  const p = await prisma.participant.findMany();
  console.log("Participants:");
  console.log(p.map(x => ({ name: x.name, email: x.email })));
  
  const e = await prisma.emailLog.findMany();
  console.log("Email Logs:");
  console.log(e.map(x => ({ email: x.recipientEmail, status: x.status })));
}

check().catch(console.error).finally(() => process.exit(0));
