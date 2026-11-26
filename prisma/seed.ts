import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set DEMO_ADMIN_EMAIL and a DEMO_ADMIN_PASSWORD of at least 12 characters before seeding.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, name: "Workspace Admin" },
    create: { email, passwordHash, role: Role.ADMIN, name: "Workspace Admin" },
  });

  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { name: "Starter" },
      update: {},
      create: { name: "Starter", description: "For teams building their first recurring revenue stream.", priceCents: 2900, usageAllowance: 10000 },
    }),
    prisma.plan.upsert({
      where: { name: "Growth" },
      update: {},
      create: { name: "Growth", description: "More room for growing teams and customer usage.", priceCents: 7900, usageAllowance: 50000 },
    }),
    prisma.plan.upsert({
      where: { name: "Scale" },
      update: {},
      create: { name: "Scale", description: "Advanced capacity for established subscription businesses.", priceCents: 19900, usageAllowance: 200000 },
    }),
  ]);

  const customers = await Promise.all([
    prisma.customer.upsert({ where: { email: "olivia@northstar.example" }, update: {}, create: { name: "Olivia Chen", email: "olivia@northstar.example", company: "Northstar Labs", planId: plans[1].id } }),
    prisma.customer.upsert({ where: { email: "marcus@orbit.example" }, update: {}, create: { name: "Marcus Hill", email: "marcus@orbit.example", company: "Orbit Studio", planId: plans[0].id } }),
    prisma.customer.upsert({ where: { email: "maya@fieldnote.example" }, update: {}, create: { name: "Maya Patel", email: "maya@fieldnote.example", company: "Fieldnote", planId: plans[2].id } }),
    prisma.customer.upsert({ where: { email: "ethan@brightpath.example" }, update: {}, create: { name: "Ethan Brooks", email: "ethan@brightpath.example", company: "Brightpath", planId: plans[1].id, status: "TRIAL" } }),
  ]);

  const usageExamples = [
    { customerId: customers[0].id, units: 18420, metric: "API calls" },
    { customerId: customers[1].id, units: 7240, metric: "API calls" },
    { customerId: customers[2].id, units: 63800, metric: "API calls" },
    { customerId: customers[0].id, units: 312, metric: "Reports generated" },
  ];
  for (const sample of usageExamples) {
    const existing = await prisma.usageRecord.findFirst({ where: { customerId: sample.customerId, metric: sample.metric } });
    if (!existing) await prisma.usageRecord.create({ data: { ...sample, createdById: admin.id } });
  }

  const billingExamples = [
    { customerId: customers[0].id, amountCents: 7900, description: "Growth plan · monthly subscription", idempotencyKey: "seed-growth-invoice-001" },
    { customerId: customers[1].id, amountCents: 2900, description: "Starter plan · monthly subscription", idempotencyKey: "seed-starter-invoice-001" },
    { customerId: customers[2].id, amountCents: 19900, description: "Scale plan · monthly subscription", idempotencyKey: "seed-scale-invoice-001" },
  ];
  for (const sample of billingExamples) {
    await prisma.billingEvent.upsert({
      where: { idempotencyKey: sample.idempotencyKey },
      update: {},
      create: { ...sample, status: "SUCCEEDED" },
    });
  }

  const auditCount = await prisma.auditLog.count();
  if (!auditCount) {
    await prisma.auditLog.create({
      data: { actorId: admin.id, action: "workspace.seeded", entityType: "Workspace", entityId: "demo", details: { plans: plans.length, customers: customers.length } },
    });
  }
  console.log(`Seeded demo workspace. Sign in as ${email} using the configured password.`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
