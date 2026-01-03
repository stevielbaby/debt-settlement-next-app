const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearSubscriptions() {
  try {
    console.log('Clearing test subscription data...');

    // Delete any existing subscriptions for the test firm
    const deletedSubscriptions = await prisma.firmSubscription.deleteMany({
      where: {
        firmId: 'firm-singleton'
      }
    });

    console.log(`Deleted ${deletedSubscriptions.count} subscription records`);

    // Also clear any related invoices
    const deletedInvoices = await prisma.invoice.deleteMany({
      where: {
        firmId: 'firm-singleton'
      }
    });

    console.log(`Deleted ${deletedInvoices.count} invoice records`);

    console.log('✅ Test subscription data cleared successfully!');
  } catch (error) {
    console.error('Error clearing subscription data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearSubscriptions();
