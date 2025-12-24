/**
 * Auth Adapter for Next-Auth v5
 */

import { auth } from '@/auth';
import type { AuthUser } from '@/packages/billing-kit/src/types';
import type { AuthAdapter } from '@/packages/billing-kit/src/adapters/auth-adapter';

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
