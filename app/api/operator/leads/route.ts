import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore - Extended session properties from auth.d.ts
    const role = session.user.role;

    // Only operators and webmasters can access leads
    if (role !== 'operator' && role !== 'webmaster') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const leads = await sql`
      SELECT
        id,
        case_number,
        first_name,
        last_name,
        email,
        phone,
        situation,
        debt_amount,
        current_company,
        converted,
        created_at
      FROM app.leads
      WHERE converted = FALSE
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
