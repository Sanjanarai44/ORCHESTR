import prisma from './src/config/prisma.js';
const r = await prisma.participant.findMany({ select: { skill: true } });
const skills = [...new Set(r.map(x => x.skill))];
console.log('Skills in DB:', skills);
console.log('Total participants:', r.length);
await prisma.$disconnect();