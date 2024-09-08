import { prisma } from "@/lib/prisma";
import { audit } from "@/modules/audit/service";
import { enqueueNotification } from "@/modules/notifications/service";
import { MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import { z } from "zod";

export const createMaintenanceSchema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.nativeEnum(MaintenancePriority).default("MEDIUM"),
  tenantId: z.string().optional(),
});

export const updateMaintenanceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  assignedTo: z.string().optional().nullable(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceInput = z.infer<typeof updateMaintenanceSchema>;

export async function listMaintenanceRequests(
  organizationId: string,
  filters?: { status?: MaintenanceStatus; propertyId?: string }
) {
  return prisma.maintenanceRequest.findMany({
    where: {
      organizationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.propertyId && { propertyId: filters.propertyId }),
    },
    include: {
      property: true,
      unit: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export async function getMaintenanceRequest(
  organizationId: string,
  requestId: string
) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, organizationId },
    include: {
      property: true,
      unit: true,
      documents: true,
    },
  });
  if (!request) throw new Error("Maintenance request not found");
  return request;
}

export async function createMaintenanceRequest(
  organizationId: string,
  actorUserId: string,
  input: CreateMaintenanceInput
) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, organizationId },
  });
  if (!property) throw new Error("Property not found");

  const request = await prisma.maintenanceRequest.create({
    data: {
      ...input,
      organizationId,
      submittedBy: actorUserId,
      status: "OPEN",
    },
  });

  await audit({
    organizationId,
    actorUserId,
    action: "maintenance.created",
    resourceType: "maintenance",
    resourceId: request.id,
  });

  await enqueueNotification({
    organizationId,
    type: "maintenance.created",
    subject: `New maintenance request: ${input.title}`,
    body: `A new ${input.priority.toLowerCase()} priority maintenance request has been submitted for ${property.name}.`,
  });

  return request;
}

export async function assignMaintenanceRequest(
  organizationId: string,
  actorUserId: string,
  requestId: string,
  assignedTo: string
) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, organizationId },
  });
  if (!request) throw new Error("Request not found");

  // Verify assignee belongs to org
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId: assignedTo },
  });
  if (!membership) throw new Error("Assignee does not belong to organization");

  const updated = await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data: { assignedTo, status: "ASSIGNED" },
  });

  await audit({
    organizationId,
    actorUserId,
    action: "maintenance.assigned",
    resourceType: "maintenance",
    resourceId: requestId,
    metadata: { assignedTo },
  });

  await enqueueNotification({
    organizationId,
    userId: assignedTo,
    type: "maintenance.assigned",
    subject: `Maintenance request assigned to you`,
    body: `You have been assigned: ${request.title}`,
  });

  return updated;
}

export async function updateMaintenanceRequest(
  organizationId: string,
  actorUserId: string,
  requestId: string,
  input: UpdateMaintenanceInput
) {
  const request = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, organizationId },
  });
  if (!request) throw new Error("Request not found");

  const data: Record<string, unknown> = { ...input };
  if (input.status === "COMPLETED") {
    data.completedAt = new Date();
  }

  const updated = await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data,
  });

  if (input.status === "COMPLETED") {
    await audit({
      organizationId,
      actorUserId,
      action: "maintenance.completed",
      resourceType: "maintenance",
      resourceId: requestId,
    });
  }

  return updated;
}
