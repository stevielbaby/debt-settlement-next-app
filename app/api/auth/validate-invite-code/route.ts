/**
 * Validate Invite Code API
 * Checks if an invite code is valid and returns associated organization info
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    // Look up the organization by invite code
    const result = await sql`
      SELECT id, name, email FROM app.organizations 
      WHERE UPPER(invite_code) = UPPER(${code}) 
      AND invite_code IS NOT NULL
    `;

    if (result.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid or expired invite code',
        },
        { status: 200 }
      );
    }

    const organization = result[0];

    return NextResponse.json(
      {
        valid: true,
        organization: {
          id: organization.id,
          name: organization.name,
          email: organization.email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Invite code validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}
