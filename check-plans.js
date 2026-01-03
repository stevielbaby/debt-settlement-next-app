const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPlans() {
  try {
    console.log('Checking available plans in database...');

    const plans = await prisma.stripePlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        priceCents: true,
        stripePriceId: true
      }
    });

    console.log('Available plans:', plans);

    if (plans.length === 0) {
      console.log('No plans found. Creating test plans...');

      // Create some test plans
      await prisma.stripePlan.createMany({
        data: [
          {
            id: 'plan-basic',
            stripeProductId: 'prod_basic',
            stripePriceId: 'price_basic',
            name: 'Basic Plan',
            description: 'Basic debt settlement services',
            priceCents: 9900, // $99
            interval: 'month',
            isActive: true
          },
          {
            id: 'plan-professional',
            stripeProductId: 'prod_pro',
            stripePriceId: 'price_pro',
            name: 'Professional Plan',
            description: 'Professional debt settlement services',
            priceCents: 19900, // $199
            interval: 'month',
            isActive: true
          }
        ]
      });

      console.log('Test plans created!');
    }

    // Check subscriptions
    const subscriptions = await prisma.firmSubscription.findMany({
      where: { firmId: 'firm-singleton' }
    });

    console.log('Current subscriptions for firm-singleton:', subscriptions);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlans();
