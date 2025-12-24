/**
 * Example: Auth Adapter for Next-Auth v5
 * Copy to: lib/billing/auth-adapter.ts
 */

import { auth } from '@/auth'; // Your Next-Auth v5 auth.ts export
import type { AuthAdapter, AuthUser } from '@billing-kit/core';

export class AppAuthAdapter implements AuthAdapter {
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await auth();

    if (!session || !session.user) {
      return null;
    }

    return {
      id: session.user.id || session.user.email!,
      email: session.user.email!,
      name: session.user.name || null,
    };
  }

  async requireUser(): Promise<AuthUser> {
    const user = await this.getCurrentUser();

    if (!user) {
      throw new Error('Unauthorized: Authentication required');
    }

    return user;
  }

  async isAdmin(userId: string): Promise<boolean> {
    const session = await auth();

    if (!session || !session.user) {
      return false;
    }

    // Customize based on your role system
    return (session.user as any).role === 'admin';
  }
}

// Export singleton instance
export const authAdapter = new AppAuthAdapter();
