import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { usageSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const records = await prisma.usageRecord.findMany({
      include: { customer: { select: { id: true, name: true, company: true, plan: { select: { name: true, usageAllowance: true } } } } },
      orderBy: { recordedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ records });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, [Role.ADMIN, Role.ANALYST]);
    const input = usageSchema.parse(await request.json());
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.usageRecord.create({ data: { ...input, createdById: user.id } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "usage.recorded", entityType: "UsageRecord", entityId: created.id, details: { customerId: created.customerId, units: created.units, metric: created.metric } },
      });
      return created;
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
