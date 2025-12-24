/**
 * Database Adapter for Neon Postgres
 */

import { neon } from '@neondatabase/serverless';
import type { DBAdapter } from '@/packages/billing-kit/src/adapters/db-adapter';

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
      // Convert $1, $2 style query into a tagged template for neon
      const values = params || [];
      if (values.length === 0) {
        const rows = await (this.sql as any)([sql] as any) as T[];
        return { rows, rowCount: rows.length };
      }

      const parts: string[] = [];
      const re = /\$(\d+)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const orderedValues: any[] = [];
      while ((match = re.exec(sql)) !== null) {
        const idx = Number(match[1]) - 1;
        parts.push(sql.slice(lastIndex, match.index));
        orderedValues.push(values[idx]);
        lastIndex = re.lastIndex;
      }
      parts.push(sql.slice(lastIndex));

      // Create a TemplateStringsArray-like object
      const strings = parts as any;
      strings.raw = parts;

      const rows = await (this.sql as any)(strings, ...orderedValues) as T[];

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
