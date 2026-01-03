import { z } from 'zod';

console.log('Testing minimal Zod schema...');

const testSchema = z.object({
  leadType: z.enum(['DEBT_SETTLEMENT', 'BANKRUPTCY']).optional(),
  contact: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10),
  }),
  intakePayload: z.record(z.any()),
  debtAmount: z.number().int().min(0).optional(),
});

const testData = {
  leadType: 'DEBT_SETTLEMENT',
  contact: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0123',
  },
  intakePayload: {
    situation: 'Test situation',
  },
  debtAmount: 25000,
};

try {
  const result = testSchema.safeParse(testData);
  console.log('Schema validation result:', result);
} catch (error) {
  console.error('Schema error:', error);
}



