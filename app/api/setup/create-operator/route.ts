import { NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

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

    // Create or update test operator user with correct bcrypt hash for password: operator123
    const userResult = await sql`
      INSERT INTO app.users (email, password_hash, name, role, org_id, status)
      VALUES (
        'operator@strattondefense.com',
        '$2b$10$gtBp8b5TmLiFWMiiD6QD2OU6tc5Kp9qs.Zj3tVa0cOucw6JRut1hW',
        'Test Operator',
        'operator',
        ${orgId},
        'active'
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = '$2b$10$gtBp8b5TmLiFWMiiD6QD2OU6tc5Kp9qs.Zj3tVa0cOucw6JRut1hW',
        role = 'operator',
        status = 'active'
      RETURNING id, email, role
    `;

    return NextResponse.json({
      success: true,
      message: 'Operator setup complete',
      operator: userResult.length > 0 ? userResult[0] : { email: 'operator@strattondefense.com', role: 'operator' },
      credentials: {
        email: 'operator@strattondefense.com',
        password: 'operator123'
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
