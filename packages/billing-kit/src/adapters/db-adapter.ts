/**
 * Database Adapter Interface
 * Host app must implement this interface to provide database access
 * billing-kit has ZERO dependencies on specific database drivers
 */

export interface DBAdapter {
  /**
   * Execute a parameterized query and return rows
   * @param sql - SQL query with $1, $2, etc. placeholders
   * @param params - Array of parameter values
   * @returns Promise resolving to query result with rows
   */
  query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }>;

  /**
   * Optional: Transaction support
   * If not implemented, billing-kit will fall back to individual queries
   */
  transaction?<T>(
    callback: (client: DBAdapter) => Promise<T>
  ): Promise<T>;
}
