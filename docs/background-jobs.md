# Background Jobs

## Design Philosophy

Background jobs in PropertyOS run business logic that cannot be triggered by a user action — time-based events like lease expiry and monthly billing. They are:

- **Idempotent** — running a job twice produces the same result as running it once.
- **Non-blocking** — they never delay an HTTP response. Notifications are enqueued, not sent inline.
- **Org-aware** — each job iterates all organizations and applies its logic per-org, respecting tenant isolation.

## Job Trigger

Jobs are exposed as an HTTP endpoint rather than a persistent worker process:

```
POST /api/jobs?job=expiring-leases
POST /api/jobs?job=monthly-charges
```

The endpoint is guarded by a shared secret in the `x-job-secret` header. This keeps the deployment simple (no separate worker process or queue) while making it trivial to integrate with any scheduler — Vercel Cron, crontab, GitHub Actions, AWS EventBridge, etc.

```typescript
// src/app/api/jobs/route.ts
export async function POST(request: Request) {
  const secret = request.headers.get("x-job-secret");
  if (secret !== process.env.JOB_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // ...
}
```

## Job 1: Expiring Leases (Daily)

**File:** `src/modules/jobs/lease-jobs.ts` → `checkExpiringLeases()`

**Purpose:** Mark leases approaching their end date and end leases that have already expired.

### Flow

```
For each organization:
    │
    ▼
Find ACTIVE leases where endDate ≤ today + 30 days
    │
    ▼
For each such lease:
    ├── Update lease status: ACTIVE → EXPIRING
    └── Enqueue notification: "lease.expiring"
    │
    ▼
Bulk update: ACTIVE | EXPIRING leases where endDate < today → ENDED
```

### Idempotency

- `EXPIRING` leases are already `EXPIRING` — updating them again is a no-op in the database.
- `ENDED` leases are excluded from the first query (it only targets `ACTIVE`), so they won't be re-processed.
- Notifications may be enqueued multiple times if the job runs more than once on the same day for the same lease. A production system would deduplicate by adding a `(organizationId, type, resourceId, date)` unique constraint on the notifications table, or by checking for an existing unprocessed notification before enqueuing.

### The 30-Day Window

`addDays(new Date(), 30)` computes the cutoff at job runtime. If the job runs daily at midnight, this gives managers a consistent 30-day heads-up. The window is hardcoded — making it configurable per-organization would be a natural future enhancement.

## Job 2: Monthly Rent Charges (Monthly)

**File:** `src/modules/payments/service.ts` → `generateMonthlyCharges()`  
**Orchestrator:** `src/modules/jobs/lease-jobs.ts` → `generateAllMonthlyCharges()`

**Purpose:** Create one `RentCharge` record per active lease for the current billing period, then mark any past-due charges as overdue.

### Flow

```
Compute billingPeriod = "YYYY-MM" (e.g. "2024-08")
    │
    ▼
Find all ACTIVE | EXPIRING leases in org
    │
    ▼
For each lease:
    ├── INSERT INTO rent_charges (leaseId, billingPeriod, amount, dueDate)
    │   ON UNIQUE VIOLATION → skip (already generated)
    └── Increment created or skipped counter
    │
    ▼
markOverdueCharges():
    UPDATE rent_charges SET status = OVERDUE
    WHERE status IN (PENDING, PARTIALLY_PAID)
    AND dueDate < now
```

### Idempotency Guarantee

The `RentCharge` table has a database-level unique constraint:

```sql
UNIQUE (lease_id, billing_period)
```

The job attempts an `INSERT` for each lease. If the charge already exists for this billing period, PostgreSQL raises a unique constraint violation. The job catches that exception and counts it as `skipped`. No duplicate charge is created, and no data is mutated.

This means:
- Running the job on August 1st and again on August 5th produces exactly one charge for `"2024-08"`.
- If the job fails halfway through, re-running it creates charges for the remaining leases and skips the ones already done.
- Manually triggering the job (e.g. during testing) never corrupts production data.

### Due Date

All charges for a billing period are due on the **1st of that month**:

```typescript
dueDate: new Date(now.getFullYear(), now.getMonth(), 1)
```

If the job runs on August 15th, the `dueDate` is still August 1st. The charge is immediately eligible for overdue detection. The overdue step then runs right after generation, marking it `OVERDUE` if that date has passed.

## Notification Enqueueing

Neither job sends notifications synchronously. They call `enqueueNotification()`, which inserts a row into the `notifications` table with `status: "PENDING"`. A separate call to `processNotifications()` — which would itself be triggered on a schedule — reads pending rows and delivers them (currently by marking them `SENT`; in production this would call an email provider).

This decoupling ensures that a slow or failing email provider cannot block lease processing or rent generation.

## Running Locally

```bash
# Expiring leases check
curl -X POST "http://localhost:3000/api/jobs?job=expiring-leases" \
  -H "x-job-secret: $(grep JOB_SECRET .env | cut -d= -f2)"

# Monthly rent charge generation
curl -X POST "http://localhost:3000/api/jobs?job=monthly-charges" \
  -H "x-job-secret: $(grep JOB_SECRET .env | cut -d= -f2)"
```

Both return `{ "ok": true, "job": "..." }` on success.
