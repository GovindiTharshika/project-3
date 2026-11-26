# Validation report

**Run date:** 2026-11-26  
**Scope:** local PostgreSQL 17 demo, application checks, and standalone container smoke test

## Completed checks

| Check | Result | Evidence |
|---|---|---|
| Prisma client generation | PASS | `npm run db:generate` |
| Database migration | PASS | `npm run db:migrate` applied `20261126000000_init` to a fresh local database |
| Repeatable demo seed | PASS | `npm run db:seed` created the administrator, three plans, four customers, usage examples, three simulated billing events, and initial activity |
| TypeScript | PASS | `npm run typecheck` |
| Focused input tests | PASS | `npm test` — 3 tests passed, 0 failed |
| Lint | PASS | `npm run lint` |
| Next.js production build | PASS | `npm run build` — Next.js 15.5.29 |
| Production dependency audit | PASS | `npm audit --omit=dev` — 0 vulnerabilities reported |
| Docker image build | PASS | `docker build --tag subscript-analytics:local .` |
| API smoke | PASS | Admin login and analytics returned 200; invalid usage returned 400; simulated charge returned 201; duplicate idempotency key returned 409 |
| Role checks | PASS | Viewer resource read returned 200; viewer plan mutation returned 403 |
| Container runtime | PASS | Production image served the app, authenticated against PostgreSQL, returned three active customers, and set a `Secure` session cookie |

## Observed demo data

After seeding, the analytics endpoint reported three active customers, four new customer records for the current month, three successful billing events totaling 30,700 cents, and an active plan distribution of one customer each on Starter, Growth, and Scale. The fourth seeded customer is in trial status.

The temporary viewer and billing event used for the API smoke checks were removed after the checks. The local PostgreSQL container and application container were stopped. No credentials were written to the project.

## Limitations of this evidence

The automated suite focuses on input schemas; it is not a full PostgreSQL-backed CI test suite. API and role checks were run manually against a local seeded database. No independent peer review, load test, accessibility audit, or production deployment was performed. Follow the [QA checklist](./qa-checklist.md) for the remaining manual acceptance review before presenting the project.
