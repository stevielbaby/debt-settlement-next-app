const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNotes() {
  try {
    console.log('Testing notes API...');

    // Get existing case
    const cases = await prisma.case.findMany({
      include: {
        lead: true,
        firm: true
      }
    });

    if (cases.length === 0) {
      console.log('No cases found. Creating test data...');

      // Create a test lead
      const firm = await prisma.firm.findFirst();
      const lead = await prisma.lead.create({
        data: {
          firmId: firm.id,
          type: 'DEBT_SETTLEMENT',
          email: 'test@example.com',
          fullName: 'Test User',
          phone: '555-123-4567',
          debtAmount: 5000,
          status: 'CONVERTED'
        }
      });

      // Create a test case
      const testCase = await prisma.case.create({
        data: {
          firmId: firm.id,
          leadId: lead.id,
          caseNumber: 999,
          email: lead.email,
          status: 'ACTIVE'
        }
      });

      console.log('Created test case:', testCase.id);
      return;
    }

    const testCase = cases[0];
    console.log('Using existing case:', testCase.id);

    // Test GET notes (should return empty array)
    console.log('Testing GET notes...');
    const response = await fetch(`http://localhost:3000/api/operator/cases/notes?caseId=${testCase.id}`);
    const data = await response.json();
    console.log('GET response:', JSON.stringify(data, null, 2));

    // Test POST note
    console.log('Testing POST note...');
    const postResponse = await fetch(`http://localhost:3000/api/operator/cases/notes?caseId=${testCase.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteBody: 'Test note from API' })
    });
    const postData = await postResponse.json();
    console.log('POST response:', JSON.stringify(postData, null, 2));

    // Test GET notes again (should now return the note)
    console.log('Testing GET notes again...');
    const response2 = await fetch(`http://localhost:3000/api/operator/cases/notes?caseId=${testCase.id}`);
    const data2 = await response2.json();
    console.log('GET response after POST:', JSON.stringify(data2, null, 2));

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotes();
