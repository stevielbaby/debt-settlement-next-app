/**
 * Example: Database Adapter for Neon Postgres
 * Copy to: lib/billing/db-adapter.ts
 */

import { neon } from '@neondatabase/serverless';
import type { DBAdapter } from '@billing-kit/core';

export class AppDBAdapter implements DBAdapter {
  private sql: ReturnType<typeof neon>;

  constructor() {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.sql = neon(dbUrl);
  }

  async query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const rows = await this.sql(sql, params || []) as T[];

      return {
        rows,
        rowCount: rows.length,
      };
    } catch (error: any) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const dbAdapter = new AppDBAdapter();
