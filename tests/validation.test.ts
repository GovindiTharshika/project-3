import assert from "node:assert/strict";
import test from "node:test";
import { billingSchema, customerSchema, planSchema, usageSchema } from "../lib/validation";

test("plans reject negative prices and non-integer allowances", () => {
  const base = { name: "Growth", description: "A plan for teams.", priceCents: 7900, interval: "month", usageAllowance: 5000 };
  assert.equal(planSchema.safeParse(base).success, true);
  assert.equal(planSchema.safeParse({ ...base, priceCents: -1 }).success, false);
  assert.equal(planSchema.safeParse({ ...base, usageAllowance: 1.5 }).success, false);
});

test("customer input requires a valid email and a bounded name", () => {
  const base = { name: "A Customer", email: "a@example.com", company: "Example Co", planId: "plan_1" };
  assert.equal(customerSchema.safeParse(base).success, true);
  assert.equal(customerSchema.safeParse({ ...base, email: "not-an-email" }).success, false);
  assert.equal(customerSchema.safeParse({ ...base, name: "x".repeat(101) }).success, false);
});

test("usage and simulated charges require positive integer quantities", () => {
  assert.equal(usageSchema.safeParse({ customerId: "cus_1", units: 1, metric: "API calls" }).success, true);
  assert.equal(usageSchema.safeParse({ customerId: "cus_1", units: 0, metric: "API calls" }).success, false);
  assert.equal(billingSchema.safeParse({ customerId: "cus_1", amountCents: 99, description: "Monthly plan", idempotencyKey: "unique-key-001" }).success, true);
  assert.equal(billingSchema.safeParse({ customerId: "cus_1", amountCents: 0, description: "Monthly plan", idempotencyKey: "unique-key-001" }).success, false);
});
