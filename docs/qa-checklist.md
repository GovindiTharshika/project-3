# QA and review checklist

## Automated checks

- [ ] `npm run typecheck` — TypeScript checks all routes and UI.
- [ ] `npm test` — validates malformed and boundary plan/customer/usage/billing inputs.
- [ ] `npm run lint` — Next.js/TypeScript lint rules.
- [ ] `npm run build` — production compilation and Prisma client generation.

## Manual acceptance review

1. Fresh setup: start PostgreSQL, apply migrations, seed, and sign in using environment credentials.
2. Verify dashboard metrics are sourced from seeded database records; no external service is required.
3. As ADMIN, add a plan, customer, usage record, and simulated billing event. Confirm each resource list and activity log updates.
4. Confirm simulated charge is visibly labeled and has no external payment effect.
5. As ANALYST, read all resources and create usage/billing; confirm plan/customer creation is denied with 403.
6. As VIEWER, confirm reads work and all mutations are denied with 403.
7. Send invalid email, zero/negative usage, zero/negative billing, duplicate customer email, duplicate plan name, and unknown foreign keys; confirm no invalid row is written and the API returns a clear 4xx response.
8. Sign out and confirm protected endpoints return 401.
9. Review the browser at narrow/mobile width and ensure tables scroll instead of clipping.

## Evidence

The committed tests cover schema-level validation cases. Run commands in the repository root and retain terminal output or CI results with the project submission. Manual role and database checks require a running PostgreSQL instance and role-specific users.

## Known validation gap

This MVP includes focused schema tests and build/type/lint checks. It does not yet include automated PostgreSQL-backed endpoint authorization, transaction rollback, browser interaction, load, or accessibility tests. Complete the manual acceptance steps before presenting a live demo.
