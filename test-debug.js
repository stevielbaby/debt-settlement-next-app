import { z } from 'zod';

console.log('Testing basic Zod...');
const testSchema = z.object({ test: z.string() });
console.log('Basic schema works:', testSchema.safeParse({ test: 'hello' }));

console.log('Testing enum schema...');
const LeadTypeSchema = z.enum(['DEBT_SETTLEMENT', 'BANKRUPTCY']);
console.log('Enum schema works:', LeadTypeSchema.safeParse('DEBT_SETTLEMENT'));

console.log('Testing contact schema...');
const ContactInfoSchema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone number required'),
});

console.log('Contact schema works:', ContactInfoSchema.safeParse({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '555-0123'
}));