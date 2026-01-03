import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create the single firm (single-tenant mode)
  const firm = await prisma.firm.upsert({
    where: { id: 'firm-singleton' }, // Use a fixed ID for single-tenant
    update: {},
    create: {
      id: 'firm-singleton',
      name: 'Stratton Defense Law Firm',
    },
  });

  console.log('✅ Firm created:', firm);

  // Create FirmCounter for case number allocation
  const firmCounter = await prisma.firmCounter.upsert({
    where: { firmId: firm.id },
    update: {},
    create: {
      firmId: firm.id,
      nextCaseNumber: 1, // Start case numbers at 1
    },
  });

  console.log('✅ FirmCounter created:', firmCounter);

  // Note: Plans are now pulled directly from Stripe (truth source)
  // No database seeding needed - we read from Stripe.products and Stripe.prices

  // Create webmaster user
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('webmaster123', 10);

  const webmaster = await prisma.user.upsert({
    where: { firmId_email: { firmId: firm.id, email: 'webmaster@strattondefense.com' } },
    update: {},
    create: {
      firmId: firm.id,
      email: 'webmaster@strattondefense.com',
      name: 'System Administrator',
      role: 'webmaster',
      passwordHash,
    },
  });

  console.log('✅ Webmaster user created:', webmaster);

  // Create operator user
  const operator = await prisma.user.upsert({
    where: { firmId_email: { firmId: firm.id, email: 'operator@strattondefense.com' } },
    update: {},
    create: {
      firmId: firm.id,
      email: 'operator@strattondefense.com',
      name: 'Case Manager',
      role: 'operator',
      passwordHash: await bcrypt.hash('operator123', 10),
    },
  });

  console.log('✅ Operator user created:', operator);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
