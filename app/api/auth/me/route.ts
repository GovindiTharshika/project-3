import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.json({ user });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
