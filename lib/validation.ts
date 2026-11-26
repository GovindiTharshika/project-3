import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const planSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(240),
  priceCents: z.number().int().min(0).max(100_000_000),
  interval: z.enum(["month", "year"]),
  usageAllowance: z.number().int().positive().max(100_000_000),
});

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().max(254),
  company: z.string().trim().min(2).max(100),
  planId: z.string().min(1),
  status: z.enum(["ACTIVE", "TRIAL", "CANCELED"]).default("ACTIVE"),
});

export const usageSchema = z.object({
  customerId: z.string().min(1),
  units: z.number().int().positive().max(100_000_000),
  metric: z.string().trim().min(2).max(60),
});

export const billingSchema = z.object({
  customerId: z.string().min(1),
  amountCents: z.number().int().positive().max(100_000_000),
  description: z.string().trim().min(3).max(160),
  idempotencyKey: z.string().trim().min(8).max(100),
});
