/**
 * Example DB Adapter for Neon Postgres (@neondatabase/serverless)
 * Copy this file to your host app and customize as needed
 */

import { neon } from '@neondatabase/serverless';
import type { DBAdapter } from '@billing-kit/core';

/**
 * Neon Postgres adapter implementation
 * Uses Neon's serverless driver (optimal for Vercel)
 */
export class NeonAdapter implements DBAdapter {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString?: string) {
    const dbUrl = connectionString || process.env.DATABASE_URL;

    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Neon serverless driver (HTTP-based, no connection pooling needed)
    this.sql = neon(dbUrl);
  }

  /**
   * Execute parameterized query
   * Neon driver automatically uses parameterized queries
   */
  async query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      // Neon's driver returns rows directly
      const rows = await this.sql(sql, params || []) as T[];

      return {
        rows,
        rowCount: rows.length,
      };
    } catch (error: any) {
      // Re-throw with more context
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Optional: Transaction support
   * Neon serverless driver doesn't support traditional transactions
   * For critical operations, consider using neonConfig.fetchConnectionCache
   * or @neondatabase/serverless Pool for connection reuse
   */
  async transaction<T>(
    callback: (client: DBAdapter) => Promise<T>
  ): Promise<T> {
    // Simple implementation: execute callback with same adapter
    // For true ACID transactions, use Pool with BEGIN/COMMIT
    // See: https://neon.tech/docs/serverless/serverless-driver#transactions
    return callback(this);
  }
}

/**
 * Singleton instance (optional)
 * Export a pre-configured instance for convenience
 */
export const neonAdapter = new NeonAdapter();
