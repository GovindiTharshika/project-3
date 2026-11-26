# Subscript — Subscription Analytics

A portfolio-ready SaaS operations MVP for subscription teams. Subscript helps an operations lead or finance analyst answer: **Are our recurring customers, usage, and simulated revenue moving in the right direction?**

The app combines plan and customer management, usage records, simulated billing, monthly analytics, and an audit trail. The sample dataset is fictional. Billing is always simulated; this project does not connect to a payment processor or move money.

## Stakeholder, scope, and success

- **Primary stakeholder:** subscription business owner / operations lead.
- **Daily users:** administrator, analyst, and read-only viewer.
- **Decision enabled:** monitor customer counts, usage, and recorded recurring revenue to decide where to follow up.
- **MVP success measures:** a mentor can reproduce the app from this guide; role restrictions are enforced server-side; invalid monetary/usage inputs are rejected; successful mutations have an actor and audit event; dashboard totals match persisted successful billing and usage records.
- **Scope boundary:** one workspace, USD, monthly/yearly plans, manually entered usage, and deterministic simulated charges. No real payment processing, tax, proration, external identity provider, or production multi-tenant isolation.

## Technology

- Next.js App Router, React, TypeScript
- PostgreSQL 17 and Prisma migrations
- Zod request validation, bcrypt password hashes, signed HTTP-only session cookies
- Custom responsive dashboard and SVG/CSS visualizations (no chart service)
- Docker for local PostgreSQL and an optional standalone application image

## Run locally

Prerequisites: Node.js 22+, npm, and Docker Desktop (or a reachable PostgreSQL 17 instance).

1. Copy `.env.example` to `.env`. Set a unique random `SESSION_SECRET` of at least 32 bytes and choose a `DEMO_ADMIN_PASSWORD` of at least 12 characters. The seed command creates/updates the admin with this password.
2. Start PostgreSQL: `docker compose up -d db`
3. Install packages: `npm ci`
4. Apply the committed migration: `npm run db:migrate`
5. Add the repeatable fictional demo dataset: `npm run db:seed`
6. Generate Prisma Client and run the app: `npm run db:generate` then `npm run dev`
7. Open `http://localhost:3000` and sign in with `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD`.

Stop local PostgreSQL with `docker compose down`. The named volume retains its data. To clear that volume, use Docker's volume removal intentionally after backing up any data you want to keep.

## Roles

| Role | Read dashboard/resources | Create plans/customers | Record usage/simulated billing |
|---|---:|---:|---:|
| ADMIN | Yes | Yes | Yes |
| ANALYST | Yes | No | Yes |
| VIEWER | Yes | No | No |

Authorization is checked in each API handler; hiding a form in the client is not the security boundary. The bootstrap seed provisions an administrator. Analyst and viewer users can be provisioned by an operator directly in the `User` table with a bcrypt hash, or through an identity/user-management service in a production extension.

## API overview

All resource endpoints require a valid session cookie. JSON errors use `{ "error": "..." }`; invalid input returns HTTP 400, unauthenticated requests 401, insufficient role 403, duplicates 409, and missing references 404.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Sign in with email/password |
| POST | `/api/auth/logout` | Public | Clear session |
| GET | `/api/auth/me` | Signed in | Current user and role |
| GET / POST | `/api/plans` | Read / ADMIN | List or add a plan |
| GET / POST | `/api/customers` | Read / ADMIN | Search/list or add customers |
| GET / POST | `/api/usage` | Read / ADMIN, ANALYST | List or record usage |
| GET / POST | `/api/billing` | Read / ADMIN, ANALYST | List or record a simulated charge |
| GET | `/api/analytics` | Signed in | MRR-like revenue, customer, usage, plan summaries |
| GET | `/api/activity` | Signed in | Latest audit events |

`POST /api/billing` requires a caller-supplied idempotency key and stores a `SUCCEEDED` simulated event. Reusing the key is rejected as a duplicate; it does not call Stripe or any payment processor.

## Quality checks and evidence

Run:

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`tests/validation.test.ts` checks key invalid and boundary inputs. The dated [validation report](./docs/validation-report.md) records the completed build, migration, API-role, and container smoke checks. For an end-to-end manual review, sign in, inspect the seeded dashboard, add a customer/usage/simulated charge as admin, then confirm the record appears in the relevant view and Activity. API calls as a viewer should return 403 for mutations and 200 for reads. For deployment, use a fresh database and apply only `npm run db:migrate`; seed is optional.

## Deployment

The `Dockerfile` builds Next.js in standalone mode. Configure `DATABASE_URL` and `SESSION_SECRET` as deployment secrets; do not bake `.env` into the image. Run migrations as a release step (`npm run db:migrate`) before routing traffic. Serve the production app behind HTTPS because production session cookies are marked `Secure`. The Docker image runs as a non-root user. `docker-compose.yml` is for local PostgreSQL, not a production database configuration.

## Known limitations and next steps

- Single workspace and no tenant boundary; do not host unrelated organizations in this MVP.
- No production account lifecycle, password reset/MFA, user invitation UI, login throttling, or external identity provider.
- Audit events are append-only by application convention; DB-level immutability, retention, and export controls are not configured.
- The simulated billing outcome is deterministic and does not model retries, refunds, tax, failed payment recovery, or payment-provider webhooks.
- Dashboard exposes the most recent 100 records per resource; add cursor pagination and date filters for larger datasets. Revenue trend query is PostgreSQL-specific by design.
- MRR-like revenue currently means successful simulated billing total in the calendar month, not normalized contracted recurring revenue.
- Production follow-up: tenant isolation, rate limits, CSRF review, secrets rotation, managed Postgres backups, observability/alerts, accessibility testing, concurrency/idempotency review, and a real billing provider in test mode.

## Portfolio story

**Problem:** subscription operators need a shared view of customer health, consumption, and recurring charges.  
**Action:** built a typed full-stack workspace with relational migrations, role-gated REST routes, data validation, traceable activity, and simulated billing.  
**Evidence:** reproducible setup, focused validation tests, manual role/API checks, seeded demo data, and documented limitations.  
**Result:** a mentor can run the system locally and evaluate the end-to-end subscription workflow without payment credentials or external data.
