import { NextRequest, NextResponse } from "next/server";

// TEMPORARY: Database access unification in progress
// Calendar endpoints need isolation from main DB layer
export async function POST() {
  return NextResponse.json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Calendar integration temporarily unavailable during database unification"
    }
  }, { status: 503 });
}

