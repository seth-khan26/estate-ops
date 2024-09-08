import { prisma } from "@/lib/prisma";
import { audit } from "@/modules/audit/service";
import { TenantStatus } from "@prisma/client";
import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  status: z.nativeEnum(TenantStatus).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export async function listTenants(organizationId: string) {
  return prisma.tenant.findMany({
    where: { organizationId },
    include: {
      leases: {
        where: { status: { in: ["ACTIVE", "EXPIRING"] } },
        include: { unit: { include: { property: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTenant(organizationId: string, tenantId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
    include: {
      leases: {
        include: {
          unit: { include: { property: true } },
          rentCharges: {
            orderBy: { dueDate: "desc" },
            take: 12,
            include: { payments: true },
          },
        },
        orderBy: { startDate: "desc" },
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!tenant) throw new Error("Tenant not found");
  return tenant;
}

export async function createTenant(
  organizationId: string,
  actorUserId: string,
  input: CreateTenantInput
) {
  const tenant = await prisma.tenant.create({
    data: { ...input, organizationId },
  });

  await audit({
    organizationId,
    actorUserId,
    action: "tenant.created",
    resourceType: "tenant",
    resourceId: tenant.id,
  });

  return tenant;
}

export async function updateTenant(
  organizationId: string,
  actorUserId: string,
  tenantId: string,
  input: UpdateTenantInput
) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organizationId },
  });
  if (!tenant) throw new Error("Tenant not found");

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: input,
  });

  await audit({
    organizationId,
    actorUserId,
    action: "tenant.updated",
    resourceType: "tenant",
    resourceId: tenantId,
    metadata: input as Record<string, unknown>,
  });

  return updated;
}
