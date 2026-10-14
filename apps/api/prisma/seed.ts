import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});
try {
  await prisma.demoRecord.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    create: { id: '00000000-0000-4000-8000-000000000001', label: 's-clair demo' },
    update: {},
  });
} finally {
  await prisma.$disconnect();
}
