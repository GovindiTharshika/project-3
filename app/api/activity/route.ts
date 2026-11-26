import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const activity = await prisma.auditLog.findMany({
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ activity });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
