# Lease Lifecycle

## States

```
DRAFT ──────────────────────────────────────────────────────────► TERMINATED
  │                                                                    ▲
  ▼                                                                    │
PENDING_SIGNATURE ──────────────────────────────────────────────────► │
  │                                                                    │
  ▼                                                                    │
ACTIVE ──────────────────────────────────────────────────────────────► │
  │                                                                    │
  ▼                                                                    │
EXPIRING ────────────────────────────────────────────────────────────► │
  │
  ▼
ENDED
```

| State | Description |
|---|---|
| `DRAFT` | Lease has been created but not yet agreed. Editable. |
| `PENDING_SIGNATURE` | Sent for review. Awaiting confirmation. |
| `ACTIVE` | Live lease. Rent charges are generated. Unit is `OCCUPIED`. |
| `EXPIRING` | Within 30 days of `endDate`. Set by the daily background job. Triggers notification. |
| `ENDED` | `endDate` has passed and the lease was not renewed. Set by the daily job. |
| `TERMINATED` | Early termination. Set by a manager action. |

## Transition Rules

Transitions are enforced in `src/modules/leases/service.ts`. Only the explicitly listed transitions are permitted — all others throw.

### DRAFT / PENDING_SIGNATURE → ACTIVE (`activateLease`)

```typescript
if (!["DRAFT", "PENDING_SIGNATURE"].includes(lease.status)) {
  throw new Error("Only DRAFT or PENDING_SIGNATURE leases can be activated");
}

// Guard: exactly one active lease per unit
const existingActive = await prisma.lease.findFirst({
  where: {
    unitId: lease.unitId,
    status: { in: ["ACTIVE", "EXPIRING"] },
    id: { not: leaseId },
  },
});
if (existingActive) throw new Error("Unit already has an active lease");

// Atomic: lease status + unit status updated together
const [updatedLease] = await prisma.$transaction([
  prisma.lease.update({ where: { id: leaseId }, data: { status: "ACTIVE" } }),
  prisma.unit.update({ where: { id: lease.unitId }, data: { status: "OCCUPIED" } }),
]);
```

Two things worth noting:

1. **The active-lease guard is checked before the transaction, not inside it.** In a high-concurrency environment this creates a TOCTOU window. For production hardening, this check should move inside the transaction alongside a `SELECT FOR UPDATE` on the unit row, or be replaced with a partial unique index: `CREATE UNIQUE INDEX one_active_lease_per_unit ON leases(unit_id) WHERE status IN ('ACTIVE', 'EXPIRING')`.

2. **The unit status update is in the same transaction as the lease update.** If either write fails, both roll back. The two tables never fall out of sync with each other.

### ACTIVE / EXPIRING → TERMINATED (`terminateLease`)

```typescript
const [updatedLease] = await prisma.$transaction([
  prisma.lease.update({ where: { id: leaseId }, data: { status: "TERMINATED" } }),
  prisma.unit.update({ where: { id: lease.unitId }, data: { status: "VACANT" } }),
]);
```

Same pattern — the unit is freed atomically with the lease termination.

### ACTIVE → EXPIRING (background job, `checkExpiringLeases`)

The daily job computes `addDays(now, 30)` and updates all `ACTIVE` leases whose `endDate` falls within that window. It also enqueues a notification. See [background-jobs.md](./background-jobs.md).

### ACTIVE / EXPIRING → ENDED (background job)

Any lease with `endDate < now` and status `ACTIVE` or `EXPIRING` is bulk-updated to `ENDED` in the same daily run:

```typescript
await prisma.lease.updateMany({
  where: {
    organizationId: org.id,
    status: { in: ["ACTIVE", "EXPIRING"] },
    endDate: { lt: new Date() },
  },
  data: { status: "ENDED" },
});
```

Note that this does **not** automatically update unit status to `VACANT`. That is a deliberate gap — the unit might need an inspection period before being relisted. The property manager should update unit status manually after lease end. A future enhancement would be a configurable auto-vacate rule.

## One Active Lease Per Unit

The database constraint that enforces this is currently at the application level only (the guard in `activateLease`). The schema does not yet have a partial unique index to enforce it at the DB level. Adding one is the highest-priority schema hardening for production:

```sql
CREATE UNIQUE INDEX one_active_lease_per_unit
  ON leases(unit_id)
  WHERE status IN ('ACTIVE', 'EXPIRING');
```

This prevents any race condition or direct DB manipulation from creating a double-booking.

## Audit Trail

Every state transition that goes through a service function writes an audit log entry:

| Transition | Audit action |
|---|---|
| Created | `lease.created` |
| Activated | `lease.activated` |
| Terminated | `lease.terminated` |

Background job transitions (`EXPIRING`, `ENDED`) do not currently write individual audit entries — they use bulk updates. For a production system, per-lease audit entries for these transitions would be added.

## Tenant Profiles

Tenants are domain entities independent of user accounts.

## Tenant Portal

Tenants view active lease, balance, and payment schedule.

## Communications

All messages logged for auditing and dispute resolution.

## Debug Mode

`LEASE_DEBUG=true` logs all state transitions with timestamps.
