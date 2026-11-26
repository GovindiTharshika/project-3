import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const [activeCustomers, previousActiveCustomers, currentRevenue, previousRevenue, usageTotals, newCustomers] =
      await prisma.$transaction([
        prisma.customer.count({ where: { status: "ACTIVE" } }),
        prisma.customer.count({ where: { status: "ACTIVE", createdAt: { lt: monthStart } } }),
        prisma.billingEvent.aggregate({ where: { status: "SUCCEEDED", createdAt: { gte: monthStart } }, _sum: { amountCents: true }, _count: true }),
        prisma.billingEvent.aggregate({ where: { status: "SUCCEEDED", createdAt: { gte: previousMonthStart, lt: monthStart } }, _sum: { amountCents: true } }),
        prisma.usageRecord.aggregate({ where: { recordedAt: { gte: monthStart } }, _sum: { units: true } }),
        prisma.customer.count({ where: { createdAt: { gte: monthStart } } }),
      ]);
    const [revenueByMonth, customerCounts] = await Promise.all([
      prisma.$queryRaw<Array<{ month: Date; total: bigint }>>`
        SELECT date_trunc('month', "createdAt") AS month, SUM("amountCents")::bigint AS total
        FROM "BillingEvent"
        WHERE status = 'SUCCEEDED' AND "createdAt" >= ${new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))}
        GROUP BY date_trunc('month', "createdAt")
        ORDER BY month ASC
      `,
      prisma.$queryRaw<Array<{ planId: string; customers: bigint }>>`
        SELECT "planId", COUNT(*)::bigint AS customers
        FROM "Customer"
        WHERE status = 'ACTIVE'
        GROUP BY "planId"
      `,
    ]);
    const planIds = customerCounts.map((entry) => entry.planId);
    const plans = await prisma.plan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } });
    const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));

    return NextResponse.json({
      metrics: {
        activeCustomers,
        customerChange: activeCustomers - previousActiveCustomers,
        monthlyRevenueCents: currentRevenue._sum.amountCents ?? 0,
        revenueChangeCents: (currentRevenue._sum.amountCents ?? 0) - (previousRevenue._sum.amountCents ?? 0),
        invoicesThisMonth: currentRevenue._count,
        usageThisMonth: usageTotals._sum.units ?? 0,
        newCustomersThisMonth: newCustomers,
      },
      revenueByMonth: revenueByMonth.map((point) => ({ month: point.month.toISOString(), totalCents: Number(point.total) })),
      customersByPlan: customerCounts.map((entry) => ({ name: planNames.get(entry.planId) ?? "Unknown plan", customers: Number(entry.customers) })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
