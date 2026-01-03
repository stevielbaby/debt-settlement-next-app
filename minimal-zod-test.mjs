import { z } from 'zod';

console.log('Testing Zod...');

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const testData = { name: 'John', age: 30 };

try {
  const result = schema.safeParse(testData);
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error);
}



