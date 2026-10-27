/**
 * Operator Signup API
 * Handles account creation for operators with optional invite code linking
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/password-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, inviteCode } = body;

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

    const passwordHash = await hashPassword(password);
    const nameFromEmail = email.split('@')[0];
    const userId = `usr_${crypto.randomUUID()}`;

    const createUserResult = await sql`
      INSERT INTO app.users 
      (id, email, password_hash, name, role, org_id, status, created_at, updated_at)
      VALUES (${userId}, ${email}, ${passwordHash}, ${nameFromEmail}, 'operator', ${organizationId}, 'active', NOW(), NOW())
      RETURNING id, email, role, org_id
    `;

    const user = createUserResult[0];

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
