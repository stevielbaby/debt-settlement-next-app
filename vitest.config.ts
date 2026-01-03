import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node', // Use Node for Phase 0 contract/schema tests
    globals: true,
    include: [
      '**/*.{test,spec}.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});

