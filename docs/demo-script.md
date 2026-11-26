# 5-minute demo

1. **Problem (30 sec):** “A subscription operations lead needs a reliable view of active customers, usage, and recurring billing events.”
2. **Dashboard (60 sec):** Sign in, explain the revenue definition and plan distribution, and point out that sample records are fictional.
3. **Workflow (90 sec):** Open Customers and Plans; show the searchable list and current plan allowances. Add a customer if time allows.
4. **Operations (60 sec):** Record usage and a simulated charge; emphasize the simulation badge and lack of payment integration.
5. **Traceability / quality (60 sec):** Open Activity and show actor/action history. Briefly explain the role checks, validation, relational migration, and automated schema tests.
6. **Trade-offs (30 sec):** Call out single-workspace scope, simulated billing, and next steps: tenant isolation, account lifecycle, rate limiting, and pagination.

## Interview prompts

- The most important decision was keeping billing simulated so the workflow is safe and reproducible without handling payment credentials.
- Correctness is supported by database constraints, validated REST inputs, transactional audit writes, and focused input tests.
- For 10× scale, add tenant-aware data access, cursor pagination, connection pooling, indexes tuned from query plans, background billing jobs, and monitoring.
