import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      role: (session.user as any).role,
      email: session.user.email,
    });
  } catch (error) {
    console.error("Get user role error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user role" },
      { status: 500 }
    );
  }
}
