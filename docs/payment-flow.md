# Payment Flow

## Overview

Rent tracking in PropertyOS is split across two models:

- **`RentCharge`** — a monthly bill generated for an active lease. Tracks what is owed.
- **`Payment`** — a record of money received against a charge. Tracks what was paid.

A single `RentCharge` can have multiple `Payment` records (partial payments). The charge's `status` reflects the running total.

## RentCharge Statuses

```
PENDING ──► PARTIALLY_PAID ──► PAID
    │               │
    └───────────────┴──► OVERDUE
```

| Status | Condition |
|---|---|
| `PENDING` | Charge exists, no payments yet, not past due date |
| `PARTIALLY_PAID` | Some payments made, total < charge amount |
| `PAID` | Payments total equals (or within $0.01 of) charge amount |
| `OVERDUE` | `dueDate` has passed and charge is not fully paid — set by the daily job |

## Recording a Payment

All payment recording happens inside a single database transaction in `src/modules/payments/service.ts`. The sequence is:

```
BEGIN TRANSACTION
    │
    ▼
1.  SELECT rent_charge WHERE id = rentChargeId AND organizationId = orgId
    │  (Prisma uses read-within-transaction; pair with SELECT FOR UPDATE in SQL for strict locking)
    │
    ▼
2.  VALIDATE charge status ≠ PAID
    VALIDATE payment amount ≤ remaining balance
    │
    ▼
3.  INSERT payment record
    │
    ▼
4.  UPDATE rent_charge SET status = PARTIALLY_PAID | PAID
    │
    ▼
5.  INSERT audit_log (inside the same transaction)
    │
    ▼
COMMIT
```

```typescript
return prisma.$transaction(async (tx) => {
  // Step 1 — fetch charge (within transaction boundary)
  const charge = await tx.rentCharge.findFirst({
    where: { id: input.rentChargeId, organizationId },
    include: { payments: true },
  });
  if (!charge) throw new Error("Rent charge not found");
  if (charge.status === "PAID") throw new Error("Charge is already paid");

  // Step 2 — validate balance
  const totalPaid = charge.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(charge.amount) - totalPaid;
  if (input.amount > remaining + 0.01) {
    throw new Error(`Payment amount exceeds remaining balance of $${remaining.toFixed(2)}`);
  }

  // Step 3 — create payment
  const payment = await tx.payment.create({ data: { ... } });

  // Step 4 — update charge status
  const newTotalPaid = totalPaid + input.amount;
  const newStatus = newTotalPaid >= Number(charge.amount) - 0.01 ? "PAID" : "PARTIALLY_PAID";
  await tx.rentCharge.update({ where: { id: input.rentChargeId }, data: { status: newStatus } });

  // Step 5 — audit (inside transaction — if commit fails, audit is rolled back too)
  await tx.auditLog.create({ data: { action: "payment.recorded", ... } });

  return payment;
});
```

### Why the audit goes inside the transaction

The audit log write uses `tx` (the transaction client), not the global `prisma` client. This means: if the commit fails for any reason, the audit entry is also rolled back. The audit log will only ever contain entries for payments that actually committed to the database. An audit entry for a payment that doesn't exist would be worse than no audit entry.

### The $0.01 tolerance

Floating-point arithmetic on currency amounts produces rounding errors. The `0.01` buffer prevents a scenario where a tenant pays exactly `$1,800.00` on a `$1,800.00` charge, but `1800.0 >= 1800.0 - 0.01` evaluates differently due to float representation. In a production system, monetary values should use `NUMERIC` (which Prisma maps to `Decimal`) and all arithmetic should use a decimal library rather than JavaScript `Number`. The current code converts `Decimal` to `Number` for arithmetic — acceptable for MVP but should be revisited.

### Overpayment prevention

```typescript
if (input.amount > remaining + 0.01) {
  throw new Error(`Payment amount exceeds remaining balance of $${remaining.toFixed(2)}`);
}
```

A payment cannot exceed the remaining balance. Overpayments are rejected at the service layer before any writes occur.

## Monthly Rent Charge Generation

The monthly job generates one `RentCharge` per active lease per billing period. Idempotency is guaranteed by a database unique constraint:

```sql
UNIQUE (lease_id, billing_period)
```

The job catches the unique violation and counts it as `skipped`:

```typescript
for (const lease of activeLeases) {
  try {
    await prisma.rentCharge.create({
      data: {
        leaseId: lease.id,
        billingPeriod,        // e.g. "2024-08"
        amount: lease.monthlyRent,
        dueDate: new Date(year, month, 1),
        status: "PENDING",
      },
    });
    results.created++;
  } catch {
    results.skipped++;        // unique constraint violation — already generated
  }
}
```

This means the job can be run multiple times on the same day (or triggered manually to backfill) without double-charging any tenant.

## Overdue Detection

After charge generation, the daily job marks any `PENDING` or `PARTIALLY_PAID` charge whose `dueDate` is in the past as `OVERDUE`:

```typescript
await prisma.rentCharge.updateMany({
  where: {
    organizationId,
    status: { in: ["PENDING", "PARTIALLY_PAID"] },
    dueDate: { lt: new Date() },
  },
  data: { status: "OVERDUE" },
});
```

This is a bulk update — efficient and idempotent. Running it twice produces the same result.

## Payment Method

The `method` field records how the payment was made (`CASH`, `CHECK`, `BANK_TRANSFER`, `CARD`, `OTHER`). The `reference` field stores an external reference (check number, transaction ID, etc.). Neither is used to process payments — PropertyOS tracks payments, it does not process them. For online collection, a payment provider (Stripe, etc.) would record the charge externally and the webhook handler would call `recordPayment` with `method: "CARD"` and the provider's transaction ID as `reference`.

## Tenant Payments

Payment history sorted by date with running balance total.

## Payment Ledger

Every payment creates a ledger entry. Balance from entry sum.

## Late Fees

Auto-applied after grace period. Configurable per property.
