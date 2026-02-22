# PropertyOS — Technical Documentation

Implementation detail and design rationale for the senior-level patterns in this codebase. These documents explain **why** things are built the way they are, not just what they do.

## Documents

| Document | What it covers |
|---|---|
| [Architecture](./architecture.md) | Modular monolith pattern, layer stack, request flow end-to-end |
| [Multi-Tenancy](./multi-tenancy.md) | Org isolation, how `organizationId` is derived from session (never the client), enforcement at the service layer |
| [RBAC](./rbac.md) | Role → permission map, `withAuth()` middleware, what RBAC does and does not protect |
| [Lease Lifecycle](./lease-lifecycle.md) | State machine, transition guards, atomic unit status sync, the one-active-lease invariant |
| [Payment Flow](./payment-flow.md) | Transactional recording, locking, overpayment prevention, idempotent monthly charge generation |
| [Background Jobs](./background-jobs.md) | Daily lease expiry job, monthly rent job, idempotency via DB unique constraint, notification decoupling |
| [Audit Logging](./audit-logging.md) | What is logged, the append-only pattern, why payment audits go inside the transaction |
| [Maintenance Workflow](./maintenance-workflow.md) | Status state machine, cross-org assignment guard, completion timestamp, notification decoupling |
| [Database Schema](./database-schema.md) | Key design decisions — User vs Tenant distinction, PropertyOwner join model, Decimal for money, recommended production indexes |

## Where to Start

If you are new to the codebase, read in this order:

1. **Architecture** — understand the layer model before reading any code
2. **Multi-Tenancy** — the most important invariant in the system
3. **RBAC** — how every API route is protected
4. **Lease Lifecycle** — the most stateful part of the domain
5. **Payment Flow** — the most operationally critical code path
# Local Dev

`docker-compose up -d` then `npm run dev` to start the app.

## Seed Data

`npm run db:seed` creates demo org with properties and tenants.
