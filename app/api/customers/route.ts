import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
    const customers = await prisma.customer.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : undefined,
      include: { plan: true, _count: { select: { usageRecords: true, billingEvents: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ customers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request, [Role.ADMIN]);
    const input = customerSchema.parse(await request.json());
    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({ data: { ...input, email: input.email.toLowerCase() } });
      await tx.auditLog.create({
        data: { actorId: user.id, action: "customer.created", entityType: "Customer", entityId: created.id, details: { email: created.email, planId: created.planId } },
      });
      return created;
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
