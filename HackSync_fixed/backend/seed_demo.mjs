import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data...');

  // Delete all existing data
  await prisma.anomalyFlag.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.mentorConversation.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.judge.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.aiEmailContent.deleteMany();
  await prisma.participant.deleteMany();
  console.log('✅ Cleared all existing data');

  // Seed 9 demo participants for 48-hr hackathon (3 teams of 3)
  const participants = await Promise.all([
    prisma.participant.create({ data: { name: "Alice Roy",     email: "alice@mnnit.ac.in",    college: "MNNIT Allahabad",  skill: "Frontend",  stage: "roster" }}),
    prisma.participant.create({ data: { name: "Bob Singh",     email: "bob@iitd.ac.in",        college: "IIT Delhi",        skill: "Backend",   stage: "roster" }}),
    prisma.participant.create({ data: { name: "Carol Das",     email: "carol@nitk.ac.in",      college: "NIT Karnataka",    skill: "Designer",  stage: "roster" }}),
    prisma.participant.create({ data: { name: "Dev Sharma",    email: "dev@iitb.ac.in",        college: "IIT Bombay",       skill: "Frontend",  stage: "roster" }}),
    prisma.participant.create({ data: { name: "Eva Patel",     email: "eva@bits.ac.in",        college: "BITS Pilani",      skill: "Backend",   stage: "roster" }}),
    prisma.participant.create({ data: { name: "Farhan Khan",   email: "farhan@vit.ac.in",      college: "VIT Vellore",      skill: "Designer",  stage: "roster" }}),
    prisma.participant.create({ data: { name: "Gita Nair",     email: "gita@iisc.ac.in",       college: "IISc Bangalore",   skill: "Frontend",  stage: "roster" }}),
    prisma.participant.create({ data: { name: "Harsh Gupta",   email: "harsh@nsit.ac.in",      college: "NSIT Delhi",       skill: "Backend",   stage: "roster" }}),
    prisma.participant.create({ data: { name: "Isha Mehta",    email: "isha@dtu.ac.in",        college: "DTU Delhi",        skill: "Designer",  stage: "roster" }}),
  ]);
  console.log(`✅ Created ${participants.length} participants`);

  console.log('\n✅ Demo data seeded!');
  console.log('\nParticipants ready for team generation:');
  participants.forEach(p => console.log(`  ${p.name} (${p.skill}) - ${p.college}`));
  console.log('\nNext steps:');
  console.log('  1. Go to Teams tab → Generate Draft Teams');
  console.log('  2. Approve & Publish Teams');
  console.log('  3. Go to Judges tab → Add judges → Send Magic Links');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
