import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const {
      firstName,
      lastName,
      situation,
      debtAmount,
      currentCompany,
      email,
      phone
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert the lead into the database
    const result = await sql`
      INSERT INTO leads (first_name, last_name, situation, debt_amount, current_company, email, phone)
      VALUES (${firstName}, ${lastName}, ${situation}, ${debtAmount}, ${currentCompany}, ${email}, ${phone})
      RETURNING case_number
    `;

    const caseNumber = result[0].case_number;

    return NextResponse.json({
      message: 'Lead submitted successfully',
      success: true,
      caseNumber: caseNumber
    });

  } catch (error: any) {
    console.error('Error submitting lead:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch all leads from the database
    // Try to include case_number if the column exists
    let leads: any[];
    
    try {
      // First try with case_number and appointment columns
      leads = await sql`
        SELECT 
          id, 
          case_number,
          first_name, 
          last_name, 
          situation, 
          debt_amount, 
          current_company, 
          email, 
          phone,
          appointment_date,
          appointment_time,
          appointment_slot_start,
          appointment_slot_end,
          created_at
        FROM leads
        ORDER BY created_at DESC
      `;
    } catch (error: any) {
      // If case_number or appointment columns don't exist, try without them
      if (error.message && (error.message.includes('case_number') || error.message.includes('appointment') || error.message.includes('column'))) {
        try {
          leads = await sql`
            SELECT 
              id, 
              case_number,
              first_name, 
              last_name, 
              situation, 
              debt_amount, 
              current_company, 
              email, 
              phone, 
              created_at
            FROM leads
            ORDER BY created_at DESC
          `;
        } catch (innerError: any) {
          // If case_number also doesn't exist, fetch without it
          if (innerError.message && innerError.message.includes('case_number')) {
            leads = await sql`
              SELECT 
                id, 
                first_name, 
                last_name, 
                situation, 
                debt_amount, 
                current_company, 
                email, 
                phone, 
                created_at
              FROM leads
              ORDER BY created_at DESC
            `;
          } else {
            throw error; // Throw original error
          }
        }
      } else {
        throw error;
      }
    }

    // Ensure case_number is set (use id if case_number is null/undefined)
    const leadsWithCaseNumber = leads.map((lead: any) => ({
      ...lead,
      case_number: lead.case_number || lead.id
    }));

    return NextResponse.json({
      success: true,
      leads: leadsWithCaseNumber
    });

  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

