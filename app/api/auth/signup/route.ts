/**
 * Operator Signup API
 * Handles account creation for operators with optional invite code linking
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, role, inviteCode, organizationName } = body;

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

    if (inviteCode && organizationName) {
      return NextResponse.json(
        { error: 'Cannot specify both invite code and organization name' },
        { status: 400 }
      );
    }

    if (!inviteCode && !organizationName) {
      return NextResponse.json(
        { error: 'Must provide either invite code or organization name' },
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

    // If invite code provided, validate and get organization
    if (inviteCode) {
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
    } else {
      // Create new organization
      const createOrgResult = await sql`
        INSERT INTO app.organizations 
        (name, email, created_at)
        VALUES (${organizationName}, ${email}, NOW())
        RETURNING id
      `;

      organizationId = createOrgResult[0].id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const createUserResult = await sql`
      INSERT INTO app.users 
      (email, password_hash, role, org_id, status, created_at)
      VALUES (${email}, ${hashedPassword}, ${role || 'operator'}, ${organizationId}, 'active', NOW())
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
