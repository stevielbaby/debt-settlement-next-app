import { auth } from '@/auth';
import { sql } from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'webmaster') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT id, name, description, price, monthly_limit, features, is_active
      FROM app.subscription_plans
      ORDER BY monthly_limit ASC
    `;

    const plans = result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      monthly_limit: parseInt(row.monthly_limit),
      features: row.features || [],
      is_active: row.is_active,
    }));

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Plans fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
