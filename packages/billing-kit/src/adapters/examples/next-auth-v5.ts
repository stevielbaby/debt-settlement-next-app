/**
 * Example Auth Adapter for Next-Auth v5 (App Router)
 * Copy this file to your host app and customize as needed
 */

import { auth } from '@/auth'; // Your Next-Auth v5 auth.ts export
import type { AuthAdapter, AuthUser } from '@billing-kit/core';

/**
 * Next-Auth v5 adapter implementation
 * Works with credentials provider or any Next-Auth session strategy
 */
export class NextAuthAdapter implements AuthAdapter {
  /**
   * Get current user from Next-Auth session
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await auth();

    if (!session || !session.user) {
      return null;
    }

    // Map Next-Auth session user to billing-kit AuthUser
    return {
      id: session.user.id || session.user.email!, // Adjust based on your session shape
      email: session.user.email!,
      name: session.user.name || null,
    };
  }

  /**
   * Require authenticated user (throws if not authenticated)
   */
  async requireUser(): Promise<AuthUser> {
    const user = await this.getCurrentUser();

    if (!user) {
      throw new Error('Unauthorized: Authentication required');
    }

    return user;
  }

  /**
   * Optional: Check if user is admin
   * Customize based on your role system
   */
  async isAdmin(userId: string): Promise<boolean> {
    const session = await auth();

    if (!session || !session.user) {
      return false;
    }

    // Example: Check if user has admin role in session
    // Adjust based on your auth schema
    return (session.user as any).role === 'admin' || 
           (session.user as any).role === 'webmaster';
  }
}

/**
 * Singleton instance (optional)
 * Export a pre-configured instance for convenience
 */
export const nextAuthAdapter = new NextAuthAdapter();
