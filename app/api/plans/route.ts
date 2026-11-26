import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const plans = await prisma.plan.findMany({
      include: { _count: { select: { customers: true } } },
      orderBy: { priceCents: "asc" },
    });
    return NextResponse.json({ plans });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, [Role.ADMIN]);
    const input = planSchema.parse(await request.json());
    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.plan.create({ data: input });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "plan.created",
          entityType: "Plan",
          entityId: created.id,
          details: { name: created.name, priceCents: created.priceCents },
        },
      });
      return created;
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
