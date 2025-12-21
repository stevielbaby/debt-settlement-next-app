import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/app/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseNumber: string }> }
) {
  try {
    const { caseNumber: caseNumberParam } = await params;
    const caseNumber = parseInt(caseNumberParam);
    
    if (isNaN(caseNumber)) {
      return NextResponse.json(
        { error: 'Invalid case number' },
        { status: 400 }
      );
    }

    // Try to find by case_number first, then fall back to id
    let result: any[];
    
    try {
      result = await sql`
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
          appointment_date,
          appointment_time,
          appointment_slot_start,
          appointment_slot_end,
          created_at
        FROM leads
        WHERE case_number = ${caseNumber}
        LIMIT 1
      `;
    } catch (error: any) {
      // If case_number or appointment columns don't exist, try without them
      if (error.message && (error.message.includes('case_number') || error.message.includes('appointment'))) {
        try {
          result = await sql`
            SELECT 
              id,
              first_name,
              last_name,
              email,
              phone,
              situation,
              debt_amount,
              current_company,
              created_at
            FROM leads
            WHERE id = ${caseNumber}
            LIMIT 1
          `;
        } catch (innerError: any) {
          throw error; // Throw original error
        }
      } else {
        throw error;
      }
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

        const lead = result[0];
        
        return NextResponse.json({
          success: true,
          lead: {
            caseNumber: lead.case_number || lead.id,
            firstName: lead.first_name,
            lastName: lead.last_name,
            email: lead.email,
            phone: lead.phone,
            situation: lead.situation,
            debtAmount: lead.debt_amount,
            currentCompany: lead.current_company,
            appointmentDate: lead.appointment_date || null,
            appointmentTime: lead.appointment_time || null,
            appointmentSlotStart: lead.appointment_slot_start || null,
            appointmentSlotEnd: lead.appointment_slot_end || null
          }
        });

  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + error.message,
        success: false
      },
      { status: 500 }
    );
  }
}

