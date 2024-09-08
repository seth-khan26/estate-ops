# Architecture

## Pattern: Modular Monolith

PropertyOS is a modular monolith — a single deployable Next.js app divided into domain modules with strict internal boundaries. This is a deliberate choice for a SaaS MVP: it allows fast iteration and a single deployment unit while keeping business domains cleanly separated so individual modules can be extracted into services later if needed.

The alternative — starting with microservices — would introduce distributed systems complexity (network failures, eventual consistency, distributed transactions) before the domain model is even stable.

## Layer Stack

Every request passes through the same ordered layers. No layer can be skipped.

```
HTTP Request
    │
    ▼
Next.js Route Handler  (/app/api/**/route.ts)
    │  Parses and delegates — no business logic lives here
    ▼
withAuth()             (/lib/api-helpers.ts)
    │  Extracts tenant context, checks RBAC permission
    │  Returns 401/403 immediately if either fails
    ▼
Application Service    (/modules/**/service.ts)
    │  Owns business rules, cross-entity validation, orchestration
    │  Always receives organizationId from context — never from request body
    ▼
Prisma ORM             (/lib/prisma.ts)
    │  All queries are scoped to organizationId
    ▼
PostgreSQL
```

### Why this ordering matters

The tenant context and permission check happen **before** the service layer receives control. A service function never needs to ask "is the caller allowed?" — by the time it runs, that question is already answered. This keeps service code clean and makes the authorization surface easy to audit: every API handler has exactly one `withAuth(permission, ...)` call at the top.

## Module Structure

Each module under `src/modules/` owns a single domain and exposes a service file:

```
src/modules/
├── tenancy/        # Derives and provides org context from the session
├── auth/           # (NextAuth config lives in src/lib/auth.ts)
├── properties/     # Property CRUD + dashboard aggregations
├── units/          # Unit CRUD, scoped to a property
├── owners/         # Property owner records + PropertyOwner join
├── tenants/        # Domain tenants (distinct from SaaS auth users)
├── leases/         # Lease lifecycle state machine
├── payments/       # RentCharge generation + transactional payment recording
├── maintenance/    # Maintenance request workflow
├── documents/      # Document metadata (storage keys, signed URLs)
├── notifications/  # Async notification enqueue + processing
├── audit/          # Immutable audit log writes
└── jobs/           # Background job logic (lease expiry, rent generation)
```

Modules import from `@/lib/prisma` and each other's public exports. No module imports directly from another module's internals.

## Request Flow Example

`PATCH /api/properties/[id]` with `{ status: "INACTIVE" }`:

```
1. Route handler calls withAuth("properties.manage", handler)
2. withAuth calls requireTenantContext()
   → reads JWT from session cookie
   → queries membership table for userId
   → returns { userId, organizationId, role }
3. withAuth calls hasPermission(role, "properties.manage")
   → PROPERTY_MANAGER: ✓   TENANT: ✗ → 403
4. handler calls updateProperty(ctx.organizationId, ctx.userId, id, input)
5. Service queries property WHERE id = id AND organizationId = ctx.organizationId
   → row not found means either it doesn't exist OR belongs to another org → 404
6. Service updates the property
7. Service writes an audit log entry
8. Returns updated property
```

The scoped query in step 5 is the second layer of tenant isolation — even if someone bypassed RBAC, they could only touch records belonging to their own organization.

## Directory Map

```
src/
├── app/
│   ├── (dashboard)/      UI pages — server components fetch directly from modules
│   ├── api/              REST API route handlers — thin, delegate to modules
│   ├── login/
│   └── register/
├── modules/              Domain logic (see above)
├── components/
│   ├── ui/               Primitive components (Button, Card, Badge, Input…)
│   └── shared/           Feature components (forms, action buttons, sidebars)
└── lib/
    ├── prisma.ts          Singleton Prisma client with pg adapter
    ├── auth.ts            NextAuth configuration
    ├── permissions.ts     RBAC role → permission map
    ├── api-helpers.ts     withAuth() middleware + response helpers
    └── cn.ts              Tailwind class merging utility
```
