import { BillingStatus, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billingSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const events = await prisma.billingEvent.findMany({
      include: { customer: { select: { id: true, name: true, company: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ events });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, [Role.ADMIN, Role.ANALYST]);
    const input = billingSchema.parse(await request.json());
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.billingEvent.create({
        data: { ...input, status: BillingStatus.SUCCEEDED },
      });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "billing.simulated", entityType: "BillingEvent", entityId: created.id, details: { customerId: created.customerId, amountCents: created.amountCents, status: created.status } },
      });
      return created;
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
