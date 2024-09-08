# Maintenance Workflow

## State Machine

```
OPEN ──► ASSIGNED ──► IN_PROGRESS ──► COMPLETED
  │          │              │
  └──────────┴──────────────┴──► CANCELLED
```

| Status | Who sets it | Description |
|---|---|---|
| `OPEN` | System (on creation) | Request submitted, unreviewed |
| `ASSIGNED` | Property manager | Technician assigned via `assignMaintenanceRequest()` |
| `IN_PROGRESS` | Technician or manager | Work has begun |
| `COMPLETED` | Technician or manager | Work finished. Stamps `completedAt` timestamp. |
| `CANCELLED` | Manager | Request will not be addressed |

The valid transitions are enforced in the UI (`MaintenanceStatusForm`) via a `transitions` map that only shows the applicable buttons for the current status. The API does not currently enforce the state machine server-side (any `status` value can be written via `PATCH /api/maintenance/[id]`) — a production hardening would add a transition guard in the service function.

## Creation Flow

```typescript
// src/modules/maintenance/service.ts → createMaintenanceRequest()

1. Verify property belongs to org (resource-level auth)
2. Create MaintenanceRequest with status: "OPEN"
3. Write audit log: "maintenance.created"
4. Enqueue notification: "maintenance.created"   ← non-blocking
5. Return request
```

The notification is enqueued, not sent. The HTTP response returns before any email delivery attempt. This ensures a slow mail provider cannot cause a 503 on a maintenance submission.

## Assignment Flow

```typescript
// src/modules/maintenance/service.ts → assignMaintenanceRequest()

1. Fetch request, verify it belongs to org
2. Verify assignee (userId) has a membership in this org
   → Prevents assigning to a user from a different organization
3. Update request: { assignedTo: userId, status: "ASSIGNED" }
4. Write audit log: "maintenance.assigned" with metadata: { assignedTo }
5. Enqueue notification to the assignee: "maintenance.assigned"
6. Return updated request
```

Step 2 is the cross-tenancy guard for assignments. Without it, a manager could supply a `userId` from a different organization. The check:

```typescript
const membership = await prisma.membership.findFirst({
  where: { organizationId, userId: assignedTo },
});
if (!membership) throw new Error("Assignee does not belong to organization");
```

This is resource-level authorization applied to the assignment target, not just the actor.

## Completion

When a request is updated to `COMPLETED`, the service stamps `completedAt`:

```typescript
const data: Record<string, unknown> = { ...input };
if (input.status === "COMPLETED") {
  data.completedAt = new Date();
}
```

This creates a precise timestamp for how long the request was open, independent of `updatedAt` (which changes on any update, not just completion).

## Priority Ordering

Maintenance lists are ordered by priority descending, then `createdAt` descending:

```typescript
orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
```

Prisma sorts enum values alphabetically by their string representation. Because `EMERGENCY > HIGH > MEDIUM > LOW` alphabetically aligns with priority order, this works correctly. If the enum values were renamed, this ordering assumption would break — a safer approach would be a separate `priorityOrder` integer column.

## Document Attachments

The `MaintenanceRequest` model has a `documents` relation. Documents (photos, inspection reports) are stored with a `storageKey` pointing to an object storage bucket, and a `mimeType`. Retrieval should generate a signed URL with a short TTL — never expose the raw storage key or a permanent public URL. The signed URL generation is stubbed in this MVP (the `Document` model exists; the URL signing step is not yet wired up).
