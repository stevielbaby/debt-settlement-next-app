/**
 * Operator Signup API
 * Handles account creation for operators with optional invite code linking
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/app/lib/db';
import { ensureCustomer } from '@/packages/billing-kit/src/api/ensure-customer';
import type { AuthAdapter } from '@/packages/billing-kit/src/adapters/auth-adapter';
import { dbAdapter } from '@/lib/billing/db-adapter';
  import { getBillingConfig } from '@/lib/billing/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, inviteCode } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'An invite code is required to create an account' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM app.users WHERE email = ${email}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    let organizationId: string | null = null;

    // Validate and get organization from invite code
    const orgResult = await sql`
      SELECT id FROM app.organizations 
      WHERE UPPER(invite_code) = UPPER(${inviteCode})
    `;

    if (orgResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      );
    }

    organizationId = orgResult[0].id;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Extract name from email (everything before @)
    const nameFromEmail = email.split('@')[0];

    // Create user
    const createUserResult = await sql`
      INSERT INTO app.users 
      (email, password_hash, name, role, org_id, status, created_at)
      VALUES (${email}, ${hashedPassword}, ${nameFromEmail}, ${role || 'operator'}, ${organizationId}, 'active', NOW())
      RETURNING id, email, role, org_id
    `;

    const user = createUserResult[0];

    // 🔥 Create billing account for new user
    try {
      const config = getBillingConfig();

      // Minimal AuthAdapter bound to the newly created user (no session required)
      const signupAuthAdapter: AuthAdapter = {
        async getCurrentUser() {
          return {
            id: user.id,
            email: user.email,
            name: nameFromEmail,
          };
        },
        async requireUser() {
          return {
            id: user.id,
            email: user.email,
            name: nameFromEmail,
          };
        },
        async isAdmin() {
          return false;
        },
      };

      await ensureCustomer({ authAdapter: signupAuthAdapter, dbAdapter, config });
      console.log(`[billing] Created Stripe customer for user ${user.id}`);
    } catch (error) {
      console.warn(`[billing] Failed to create Stripe customer for user ${user.id}:`, error);
      // Don't fail signup - user can still use app, just won't be able to subscribe yet
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.org_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
