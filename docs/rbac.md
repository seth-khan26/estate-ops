# Role-Based Access Control (RBAC)

## Overview

Every API route is protected by `withAuth(permission, handler)`. The function resolves the caller's tenant context, checks whether their role includes the required permission, and either passes control to the handler or returns a 403 immediately.

RBAC is a necessary but insufficient guard. It answers "can this role type do this action?" — not "can this specific user touch this specific record?" Resource-level authorization (the `organizationId` scoping on every query) answers the second question.

## Roles

| Role | Who |
|---|---|
| `OWNER` | Organization owner — full access |
| `PROPERTY_MANAGER` | Staff who manage day-to-day operations |
| `MAINTENANCE` | Technicians who work on maintenance requests only |
| `PROPERTY_OWNER` | External property investors — read-only view of their assets |
| `TENANT` | Renters — limited to their own lease, payments, and maintenance |

## Permission Map

Defined in `src/lib/permissions.ts` as a static lookup table:

```
OWNER
  properties.read / manage
  units.read / manage
  owners.read / manage
  tenants.read / manage
  leases.read / manage
  payments.read / manage
  maintenance.read / manage
  documents.read / manage
  audit.read
  users.manage

PROPERTY_MANAGER
  properties.read / manage
  units.read / manage
  tenants.read / manage
  leases.read / manage
  payments.read / manage
  maintenance.read / manage
  documents.read / manage
  (no audit.read, no users.manage, no owners.manage)

MAINTENANCE
  maintenance.read / manage
  documents.read / manage

PROPERTY_OWNER
  properties.read
  units.read
  leases.read
  payments.read
  maintenance.read
  (read-only, no manage permissions)

TENANT
  leases.read
  payments.read
  maintenance.read / manage   ← can submit and view own requests
  documents.read
```

The design is intentionally simple: a flat array of strings per role, checked with `Array.includes`. This is enough for an MVP and easy to extend. A more sophisticated system would use a bitmask or a graph-based policy engine (e.g. OPA, Casbin) — the interface (`hasPermission(role, permission)`) is stable enough to swap the implementation without changing any call sites.

## The `withAuth()` Wrapper

```typescript
// src/lib/api-helpers.ts

export async function withAuth(
  permission: Permission,
  handler: (ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const ctx = await requireTenantContext();        // 1. authenticate
    if (!hasPermission(ctx.role, permission)) {
      return err("Forbidden", 403);                  // 2. authorize (role check)
    }
    return await handler(ctx);                       // 3. run — ctx carries organizationId
  } catch (e) {
    // 4. normalized error → HTTP status
    if (e instanceof Error) {
      if (e.message === "Unauthorized")  return err("Unauthorized", 401);
      if (e.message.includes("not found")) return err(e.message, 404);
      if (e.message.includes("already"))  return err(e.message, 409);
      return err(e.message, 400);
    }
    return err("Internal error", 500);
  }
}
```

Every route handler looks like this:

```typescript
// src/app/api/properties/route.ts
export async function POST(request: Request) {
  return withAuth("properties.manage", async (ctx) => {
    const input = await parseBody(request, createPropertySchema);
    const property = await createProperty(ctx.organizationId, ctx.userId, input);
    return ok(property, 201);
  });
}
```

The handler receives `ctx` and is responsible for passing `ctx.organizationId` to the service. It never constructs an `organizationId` itself.

## Error Shape

All API errors return `{ error: string }` with an appropriate HTTP status:

| Status | Condition |
|---|---|
| 401 | No valid session |
| 403 | Valid session but role lacks the required permission |
| 404 | Resource not found (or belongs to a different org — intentionally indistinguishable) |
| 409 | Conflict — e.g. duplicate active lease on a unit |
| 400 | Validation error or other bad input |

## Adding a New Protected Route

1. Create the route file under `src/app/api/`.
2. Wrap the handler with `withAuth("resource.permission", async (ctx) => { ... })`.
3. Pass `ctx.organizationId` and `ctx.userId` to the service function — never hardcode or derive them from the request.
4. If the new permission doesn't exist yet, add it to the `Permission` union type and the `rolePermissions` map in `src/lib/permissions.ts`.

## What RBAC Does Not Cover

RBAC cannot enforce record-level isolation. A `PROPERTY_MANAGER` has `properties.read` — but that doesn't mean they should see properties from other organizations. That guard lives entirely in the service layer (the `organizationId` filter on every query). Both layers are required; neither is sufficient alone.

## Auth Integration

NextAuth JWT sessions include role and organizationId.

## Owner Role

Property owners get read-only access scoped to their properties.

## Owner Dashboard

Total properties, occupancy rate, and monthly collections.

## Equity Reports

Multi-owner properties show revenue split by ownership %.

## Owner Documents

Owners download monthly statements and lease summaries.
