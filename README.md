# PropertyOS

A multi-tenant property management SaaS platform for property managers and small-to-medium property management companies.

## Key Features

### Multi-Tenancy
Every organization's data is fully isolated. Each management company is a separate tenant and `organizationId` is enforced at the service layer on every query — never trusted from the browser or URL params.

### Role-Based Access Control (RBAC)
Five roles with granular permissions:
- **Owner** — full access including user management and audit logs
- **Property Manager** — manages properties, units, tenants, leases, maintenance, and payments
- **Maintenance Staff** — views and updates assigned maintenance requests
- **Property Owner** — read-only view of owned properties, occupancy, and rent collection
- **Tenant** — views their own lease, balance, payment history, and submits maintenance requests

### Property & Unit Management
- Create and manage properties (Residential, Commercial, Mixed Use)
- Add units with bedroom/bathroom counts and monthly rent
- Unit status tracking: Vacant, Occupied, Maintenance, Unavailable
- Unit numbers enforced unique within a property

### Owner Management
- Track property owners with ownership percentage splits via a `PropertyOwner` join model
- A single property can have multiple owners

### Tenant Management
- Manage tenants as domain entities (separate from user accounts — not every tenant needs a login)
- Full lease and maintenance history per tenant

### Lease Lifecycle
Full state machine: `Draft → Pending Signature → Active → Expiring → Ended / Terminated`
- Only one active lease allowed per unit at a time — enforced at the application level
- Activating a lease automatically marks the unit as Occupied
- Terminating a lease automatically marks the unit as Vacant

### Rent Tracking
- Monthly `RentCharge` records generated per active lease with idempotency via `UNIQUE(leaseId, billingPeriod)` — safe to run repeatedly
- Charge statuses: Pending, Partially Paid, Paid, Overdue
- Automatic overdue detection

### Transactional Payment Recording
Payments are recorded inside a database transaction:
1. Lock the rent charge row
2. Validate remaining balance (prevents overpayment)
3. Create the payment record
4. Update charge status (Partially Paid / Paid)
5. Write audit log entry
6. Commit

Duplicate payments and race conditions are prevented by design.

### Maintenance Workflow
- Submit requests with priority levels: Low, Medium, High, Emergency
- Workflow: `Open → Assigned → In Progress → Completed / Cancelled`
- Assignment validates the technician belongs to the same organization
- Notifications enqueued (non-blocking) on creation and assignment

### Audit Logging
Every significant action is recorded with `actorUserId`, `resourceType`, `resourceId`, `action`, and timestamp:
- Property / unit created or updated
- Lease created, activated, terminated
- Tenant created
- Payment recorded or refunded
- Maintenance created, assigned, completed
- User invited, role changed

### Async Notifications
Notifications are enqueued in the database and processed by a background worker — transactional requests are never blocked on email delivery. Notification types include lease expiry warnings, rent due/overdue alerts, maintenance updates, and staff invitations.

### Automated Background Jobs
- **Daily** — scans active leases expiring within 30 days, updates status to `Expiring`, and enqueues notifications
- **Monthly** — generates `RentCharge` records for all active leases; idempotent by design
- Triggered via `POST /api/jobs?job=expiring-leases|monthly-charges` with a secret header guard

### Dashboard
Real-time portfolio overview calculated from live records:
- Total properties and units
- Occupancy rate
- Monthly rent roll
- Outstanding balance
- Open maintenance requests
- Leases expiring within 30 days

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Auth | NextAuth.js v5 (credentials) |
| Validation | Zod |
| Forms | React Hook Form |
| UI primitives | Radix UI, Lucide Icons |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running locally or remote)
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/propertyos"

# Random secret for signing session tokens — generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"

# Base URL of your app
NEXTAUTH_URL="http://localhost:3000"

# Secret for the background job endpoint (set to any strong random string)
JOB_SECRET="your-job-secret-here"
```

> If PostgreSQL uses a Unix socket (common on Linux), append `?host=/var/run/postgresql` to the connection string:
> `DATABASE_URL="postgresql://dev@localhost:5432/propertyos?host=/var/run/postgresql"`

### 3. Create the database

```bash
psql -U postgres -c "CREATE DATABASE propertyos"
```

### 4. Run migrations

```bash
npx prisma migrate dev
```

This creates all tables, enums, indexes, and constraints in your database.

### 5. Seed demo data (optional)

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

This creates a demo organization with:
- A property (Sunset Apartments, 2 units)
- An active tenant and lease
- An open maintenance request

**Demo login:** `admin@acme.com` / `password123`

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma studio` | Open Prisma visual database browser |

### Triggering background jobs

The lease and rent jobs are exposed as API endpoints guarded by the `JOB_SECRET` header. In production, call these from a cron scheduler (e.g. Vercel Cron, crontab, GitHub Actions).

```bash
# Mark expiring leases and send notifications (run daily)
curl -X POST "http://localhost:3000/api/jobs?job=expiring-leases" \
  -H "x-job-secret: your-job-secret-here"

# Generate monthly rent charges for all active leases (run monthly)
curl -X POST "http://localhost:3000/api/jobs?job=monthly-charges" \
  -H "x-job-secret: your-job-secret-here"
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Manager UI — properties, tenants, leases, maintenance
│   ├── api/                # REST API routes
│   ├── login/              # Auth pages
│   └── register/
├── modules/
│   ├── auth/
│   ├── tenancy/            # Tenant context — derives org from session
│   ├── properties/
│   ├── units/
│   ├── owners/
│   ├── tenants/
│   ├── leases/
│   ├── payments/
│   ├── maintenance/
│   ├── notifications/
│   ├── audit/
│   └── jobs/               # Background job logic
├── components/
│   ├── ui/                 # Primitive components
│   └── shared/             # Feature components
└── lib/
    ├── prisma.ts
    ├── auth.ts
    ├── permissions.ts      # RBAC permission map
    └── api-helpers.ts      # withAuth() middleware
```
