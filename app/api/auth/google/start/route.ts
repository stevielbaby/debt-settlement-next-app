import { NextRequest, NextResponse } from "next/server";

// TEMPORARY: Database access unification in progress
export async function GET() {
  return NextResponse.json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Endpoint temporarily unavailable during database unification"
    }
  }, { status: 503 });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED", 
      message: "Endpoint temporarily unavailable during database unification"
    }
  }, { status: 503 });
}
