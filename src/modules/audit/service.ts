import { prisma } from "@/lib/prisma";

type AuditAction =
  | "property.created"
  | "property.updated"
  | "unit.created"
  | "unit.updated"
  | "lease.created"
  | "lease.activated"
  | "lease.terminated"
  | "tenant.created"
  | "tenant.updated"
  | "payment.recorded"
  | "payment.refunded"
  | "maintenance.created"
  | "maintenance.assigned"
  | "maintenance.completed"
  | "document.accessed"
  | "document.uploaded"
  | "user.invited"
  | "role.changed";

type AuditParams = {
  organizationId: string;
  actorUserId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
};

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
