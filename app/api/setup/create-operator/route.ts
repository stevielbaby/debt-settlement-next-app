import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';
import { hashPassword, setUserPassword } from '@/app/lib/password-utils';

export async function POST(req: Request) {
  // Dev-only endpoint - remove in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Setup endpoint disabled in production' }, { status: 403 });
  }

  try {
    // Create test organization
    const orgResult = await sql`
      INSERT INTO app.organizations (firm_name, contact_email, contact_phone, status, subscription_status)
      VALUES ('Test Operator Firm', 'operator@test.com', '(555) 123-4567', 'active', 'active')
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    let orgId = orgResult.length > 0 ? orgResult[0].id : null;
    
    if (!orgId) {
      const existing = await sql`
        SELECT id FROM app.organizations WHERE firm_name = 'Test Operator Firm' LIMIT 1
      `;
      orgId = existing[0]?.id;
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Failed to get organization ID' }, { status: 500 });
    }

    const email = 'operator@strattondefense.com';
    const passwordHash = await hashPassword('operator123');
    const userResult = await sql`
      INSERT INTO app.users (email, password_hash, name, role, org_id, status, created_at, updated_at)
      VALUES (
        ${email},
        ${passwordHash},
        'Test Operator',
        'operator',
        ${orgId},
        'active',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        role = 'operator',
        status = 'active',
        updated_at = NOW()
      RETURNING id, email, role
    `;
    const operator = await setUserPassword(email, 'operator123');

    return NextResponse.json({
      success: true,
      message: 'Operator setup complete',
      operator: userResult[0] ?? operator,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
