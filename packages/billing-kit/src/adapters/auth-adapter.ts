/**
 * Auth Adapter Interface
 * Host app must implement this interface to provide user identity
 * billing-kit has ZERO dependencies on specific auth libraries
 */

import { AuthUser } from '../types';

export interface AuthAdapter {
  /**
   * Get the currently authenticated user
   * Returns null if not authenticated
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Require authentication (throws if not authenticated)
   * Use this in protected API routes
   */
  requireUser(): Promise<AuthUser>;

  /**
   * Optional: Check if user has admin privileges
   * Can be used for admin-only billing operations
   * Return false by default if not implemented
   */
  isAdmin?(userId: string): Promise<boolean>;
}
