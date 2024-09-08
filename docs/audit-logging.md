# Audit Logging

## Purpose

The audit log provides an immutable, append-only record of every significant state change in the system. It answers the question "who did what, to which record, and when?" — essential for compliance, debugging, and dispute resolution in a property management context (e.g. "when was this lease activated?", "who recorded this payment?").

## Schema

```prisma
model AuditLog {
  id             String   @id @default(cuid())
  organizationId String             // tenant isolation
  actorUserId    String             // who performed the action
  action         String             // what happened (see Actions below)
  resourceType   String             // which domain entity
  resourceId     String             // which specific record
  metadata       Json?              // additional context (amounts, old values, etc.)
  requestId      String?            // correlates entries from the same HTTP request
  createdAt      DateTime @default(now())
}
```

Indexes:
- `(organizationId, createdAt)` — for fetching an org's audit trail in chronological order
- `(organizationId, resourceType, resourceId)` — for fetching the history of a specific record

## Tracked Actions

All action strings use the pattern `resource.verb` — dot-separated, lowercase.

| Action | Trigger |
|---|---|
| `property.created` | Property added |
| `property.updated` | Property PATCH |
| `unit.created` | Unit added to a property |
| `unit.updated` | Unit PATCH |
| `lease.created` | Lease drafted |
| `lease.activated` | Lease moved to ACTIVE |
| `lease.terminated` | Lease early-terminated by a manager |
| `tenant.created` | Tenant record added |
| `tenant.updated` | Tenant PATCH |
| `payment.recorded` | A payment was committed to the database |
| `payment.refunded` | (reserved for future refund support) |
| `maintenance.created` | Maintenance request submitted |
| `maintenance.assigned` | Request assigned to a technician |
| `maintenance.completed` | Request marked COMPLETED |
| `document.accessed` | Document URL generated (signed URL flow) |
| `document.uploaded` | Document stored |
| `user.invited` | Membership created for a new user |
| `role.changed` | Membership role updated |

## Implementation Pattern

The `audit()` function in `src/modules/audit/service.ts` is a thin wrapper around a Prisma insert:

```typescript
export async function audit(params: AuditParams) {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: (params.metadata ?? {}) as object,
      requestId: params.requestId,
    },
  });
}
```

Service functions call it after their primary write succeeds:

```typescript
// From src/modules/properties/service.ts
const property = await prisma.property.create({ data: { ... } });

await audit({
  organizationId,
  actorUserId,
  action: "property.created",
  resourceType: "property",
  resourceId: property.id,
});
```

## Payment Audit — Special Case

For payment recording, the `audit()` call is placed **inside the database transaction**, using the transaction client `tx` rather than the global `prisma` client:

```typescript
return prisma.$transaction(async (tx) => {
  // ... create payment, update charge status ...

  await tx.auditLog.create({          // ← tx, not prisma
    data: { action: "payment.recorded", ... },
  });

  return payment;
});
```

This ensures that if the transaction rolls back (e.g. a constraint violation on the charge update), the audit entry is also rolled back. You will never see an audit entry for a payment that doesn't exist in the payments table. This is the correct behavior — a phantom audit entry would be more confusing than a missing one.

For non-payment actions, the audit write happens outside the primary write, which means if the audit write fails, the primary action still committed. This is an acceptable tradeoff for MVP: losing an audit entry is less bad than rolling back a legitimate business action. For strict compliance requirements, all audit writes should move inside transactions.

## What Is Not Logged

- Read-only queries (`listProperties`, `getLease`, etc.) — these generate too much noise and the indexes on `createdAt` make reads cheap to recover without explicit logging.
- Background job transitions (`EXPIRING`, `ENDED`) — the job uses `updateMany` which doesn't return individual IDs, making per-record audit entries expensive. A future enhancement would be to process these in smaller batches and audit each one.

## Accessing Audit Logs

The `audit.read` permission gates access to audit log data. Only `OWNER` role members have this permission. Audit logs are scoped to the organization — a user can only read audit entries for their own org.

A future `/api/audit-logs` endpoint and UI page would expose this data to owners.
