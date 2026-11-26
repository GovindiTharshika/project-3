# Requirements and implementation decisions

## Stakeholder framing

| Item | Definition |
|---|---|
| Business owner | Subscription business owner / operations lead |
| Users | ADMIN manages plans/customers; ANALYST records usage and simulated billing; VIEWER reads |
| Decision | Identify customer growth, usage levels, plan mix, and successful simulated billing totals |
| Input | Plan definitions, customer contact/company/plan, usage units/metric, billing amount/description |
| Output | Dashboard KPIs and trends, searchable customer list, plan/usage/billing tables, activity log |
| Constraints | Fictional data; one workspace; USD; no payment processor; PostgreSQL required |
| Success | Reproducible launch; server-enforced roles; invalid values rejected; successful writes audited; demo values visible in analytics |

## Decisions and trade-offs

1. **Next.js App Router provides UI and REST endpoints in one deployable application.** This reduces MVP deployment complexity while keeping explicit REST routes.
2. **PostgreSQL + Prisma migration keeps operational data relational.** Foreign keys protect customer/plan/user references; unique email and idempotency constraints prevent duplicate identities and charge events.
3. **Server-verified sessions and authorization:** passwords are bcrypt-hashed, sessions are signed and stored in HTTP-only cookies, and current user role is loaded from PostgreSQL on each protected request so role changes take effect without waiting for token expiry.
4. **Billing is simulated and clearly labeled.** No external payment credentials, customer card data, or network calls are used.
5. **Application-level audit trail:** each create flow commits its record and audit log in a single transaction. Audit records include actor, action, entity, timestamp, and non-secret details.
6. **SVG and CSS charts** avoid external chart services and keep the demo lightweight. The revenue series intentionally reports successful simulated billing, not recognized accounting revenue.

## Risks and controls

| Risk | MVP control | Remaining work |
|---|---|---|
| Unauthorized mutation | Per-route role checks and server-loaded role | Add automated API integration tests and security review |
| Invalid or duplicate data | Zod validation, database constraints, bounded inputs | Add stricter domain-specific quotas and normalization |
| Accidental real charge | Deterministic local simulation; no payment provider integration | Keep a separate provider adapter and test mode if extended |
| Sensitive credentials in source | Environment-only secrets, `.env` ignored, no payment details stored | Use a managed secrets vault and rotation |
| Misinterpreted KPI | UI/docs explain simulated billing and MRR-like definition | Agree on finance-approved revenue definitions |
| Growth beyond MVP | Useful indexes and bounded list responses | Tenant isolation, pagination, monitoring, retention and backups |

## Scope exclusions

Multi-tenant production hosting, real payment processing, tax/proration, invoices as legal documents, plan changes and cancellation workflows, and automated email notifications are deliberately excluded.
