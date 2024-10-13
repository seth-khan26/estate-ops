# Multi-Tenancy

## Mental Model

In PropertyOS, "tenant" is an overloaded word. The document disambiguates it this way:

| Term | Meaning |
|---|---|
| **Organization** | A SaaS customer — a property management company. This is the multi-tenancy unit. |
| **Tenant** (domain) | A person who rents a unit. A property-management concept, not a SaaS concept. |

Every table that holds organization-scoped data carries an `organizationId` column. Data from one organization is never accessible to another — this is enforced at the application layer on every query.

## Data Model

```
User  ──────── Membership ──────── Organization
                  │
                  role (OWNER | PROPERTY_MANAGER | MAINTENANCE | PROPERTY_OWNER | TENANT)
                  ownerId?    (link to Owner record if role = PROPERTY_OWNER)
                  tenantId?   (link to Tenant record if role = TENANT)
```

A `User` is an authenticated identity. An `Organization` is a SaaS tenant. `Membership` is the join that connects them and assigns a role. A single user could theoretically be a member of multiple organizations, but `requireTenantContext()` currently picks the first (oldest) membership — a sensible default for the MVP.

## Context Derivation

**The tenant context must never come from the browser.** No query string, no request body, no cookie value. It is always derived server-side from the authenticated session.

```typescript
// src/modules/tenancy/context.ts

export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();                    // reads JWT from HttpOnly cookie
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },            // keyed on the verified user identity
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,     // comes from the DB row, not the client
    role: membership.role,
    ownerId: membership.ownerId,
    tenantId: membership.tenantId,
  };
}
```

The `organizationId` in the returned context is the one stored in the database for this user's membership. It cannot be spoofed by passing `?orgId=other-org` in the URL.

## Enforcement at the Service Layer

Every service function accepts `organizationId` as its first argument and uses it as a filter on every query:

```typescript
// Correct — scoped to the org from context
export async function getProperty(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },   // ← both conditions required
  });
  if (!property) throw new Error("Property not found");
  return property;
}
```

If `propertyId` belongs to a different organization, `findFirst` returns `null` and the service throws a 404. The caller learns nothing about whether the record exists in another org — they just get "not found." This is the correct behavior (avoid leaking resource existence across tenant boundaries).

## What Is NOT Done (and Why)

**PostgreSQL Row-Level Security (RLS)** is mentioned in the MVP spec and is a valid deeper enforcement layer. It was not implemented in this MVP because:

1. Prisma's transaction client doesn't easily support setting `SET LOCAL app.current_org_id = '...'` before each query, which is required to make RLS work with a connection pool.
2. The application-layer approach (scoping every query with `organizationId`) is fully auditable and sufficient for an MVP — every query is visible in code.
3. RLS would be the right next step before a production launch to provide defense-in-depth against a query that accidentally omits the `organizationId` filter.

## Key Invariant

> Any data read or written in a service function must have its `organizationId` verified against the authenticated user's membership before it reaches the database.

If you add a new service function, always start with the pattern:

```typescript
export async function doSomething(organizationId: string, resourceId: string) {
  const record = await prisma.someModel.findFirst({
    where: { id: resourceId, organizationId },   // ← never omit organizationId
  });
  if (!record) throw new Error("Not found");
  // ...
}
```

## Tenant Isolation

`organizationId` enforced on every service-layer query.
