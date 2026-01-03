const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing database connection...');
    const firms = await prisma.firm.findMany();
    console.log('Firms:', firms);

    const cases = await prisma.case.findMany({
      include: {
        lead: true,
        firm: true
      }
    });
    console.log('Cases with relations:', JSON.stringify(cases, null, 2));

    // Create a test lead
    console.log('Creating test lead...');
    const lead = await prisma.lead.create({
      data: {
        firmId: firms[0].id,
        type: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '555-123-4567',
        debtAmount: 5000,
        status: 'NEW'
      }
    });
    console.log('Created lead:', lead);

    // Create intake submission
    const submission = await prisma.intakeSubmission.create({
      data: {
        firmId: firms[0].id,
        leadId: lead.id,
        leadType: 'DEBT_SETTLEMENT',
        email: 'test@example.com',
        debtAmount: 5000,
        payload: {
          situation: 'Test situation',
          current_company: 'Test Company'
        }
      }
    });
    console.log('Created submission:', submission);

    // Create a case from the lead (simplified for testing)
    console.log('Creating test case...');
    const newCase = await prisma.case.create({
      data: {
        firmId: firms[0].id,
        leadId: lead.id,
        caseNumber: 1,
        email: lead.email,
        status: 'ACTIVE',
      },
    });
    console.log('Created case:', newCase);

    // Update lead status to CONVERTED
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'CONVERTED' },
    });
    console.log('Updated lead status to CONVERTED');

    // Create another unconverted lead for testing
    console.log('Creating unconverted test lead...');
    const unconvertedLead = await prisma.lead.create({
      data: {
        firmId: firms[0].id,
        type: 'BANKRUPTCY',
        email: 'unconverted@example.com',
        fullName: 'Jane Smith',
        phone: '555-987-6543',
        debtAmount: 15000,
        status: 'NEW'
      }
    });

    const unconvertedSubmission = await prisma.intakeSubmission.create({
      data: {
        firmId: firms[0].id,
        leadId: unconvertedLead.id,
        leadType: 'BANKRUPTCY',
        email: 'unconverted@example.com',
        debtAmount: 15000,
        payload: {
          situation: 'Bankruptcy situation',
          current_company: 'Another Company'
        }
      }
    });

    console.log('Created unconverted lead:', unconvertedLead);
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
