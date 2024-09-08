import { prisma } from "@/lib/prisma";
import { audit } from "@/modules/audit/service";
import { LeaseStatus } from "@prisma/client";
import { z } from "zod";

export const createLeaseSchema = z.object({
  unitId: z.string().min(1),
  tenantId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.number().positive(),
  securityDeposit: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const updateLeaseSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  monthlyRent: z.number().positive().optional(),
  securityDeposit: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(LeaseStatus).optional(),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;

export async function listLeases(
  organizationId: string,
  filters?: { status?: LeaseStatus; unitId?: string; tenantId?: string }
) {
  return prisma.lease.findMany({
    where: {
      organizationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.unitId && { unitId: filters.unitId }),
      ...(filters?.tenantId && { tenantId: filters.tenantId }),
    },
    include: {
      unit: { include: { property: true } },
      tenant: true,
      _count: { select: { rentCharges: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function getLease(organizationId: string, leaseId: string) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
    include: {
      unit: { include: { property: true } },
      tenant: true,
      rentCharges: {
        orderBy: { dueDate: "desc" },
        include: { payments: true },
      },
      documents: true,
    },
  });
  if (!lease) throw new Error("Lease not found");
  return lease;
}

export async function createLease(
  organizationId: string,
  actorUserId: string,
  input: CreateLeaseInput
) {
  // Verify unit belongs to org
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, property: { organizationId } },
  });
  if (!unit) throw new Error("Unit not found");

  // Verify tenant belongs to org
  const tenant = await prisma.tenant.findFirst({
    where: { id: input.tenantId, organizationId },
  });
  if (!tenant) throw new Error("Tenant not found");

  // Check no existing active lease for unit
  const existing = await prisma.lease.findFirst({
    where: {
      unitId: input.unitId,
      status: { in: ["ACTIVE", "EXPIRING", "PENDING_SIGNATURE"] },
    },
  });
  if (existing) throw new Error("Unit already has an active lease");

  const lease = await prisma.lease.create({
    data: {
      ...input,
      organizationId,
      status: "DRAFT",
    },
    include: { unit: true, tenant: true },
  });

  await audit({
    organizationId,
    actorUserId,
    action: "lease.created",
    resourceType: "lease",
    resourceId: lease.id,
  });

  return lease;
}

export async function activateLease(
  organizationId: string,
  actorUserId: string,
  leaseId: string
) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
  });
  if (!lease) throw new Error("Lease not found");
  if (!["DRAFT", "PENDING_SIGNATURE"].includes(lease.status)) {
    throw new Error("Only DRAFT or PENDING_SIGNATURE leases can be activated");
  }

  // Enforce one active lease per unit
  const existingActive = await prisma.lease.findFirst({
    where: {
      unitId: lease.unitId,
      status: { in: ["ACTIVE", "EXPIRING"] },
      id: { not: leaseId },
    },
  });
  if (existingActive) throw new Error("Unit already has an active lease");

  const [updatedLease] = await prisma.$transaction([
    prisma.lease.update({
      where: { id: leaseId },
      data: { status: "ACTIVE" },
    }),
    prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "OCCUPIED" },
    }),
  ]);

  await audit({
    organizationId,
    actorUserId,
    action: "lease.activated",
    resourceType: "lease",
    resourceId: leaseId,
  });

  return updatedLease;
}

export async function terminateLease(
  organizationId: string,
  actorUserId: string,
  leaseId: string
) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
  });
  if (!lease) throw new Error("Lease not found");

  const [updatedLease] = await prisma.$transaction([
    prisma.lease.update({
      where: { id: leaseId },
      data: { status: "TERMINATED" },
    }),
    prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "VACANT" },
    }),
  ]);

  await audit({
    organizationId,
    actorUserId,
    action: "lease.terminated",
    resourceType: "lease",
    resourceId: leaseId,
  });

  return updatedLease;
}

export async function updateLease(
  organizationId: string,
  actorUserId: string,
  leaseId: string,
  input: UpdateLeaseInput
) {
  const lease = await prisma.lease.findFirst({
    where: { id: leaseId, organizationId },
  });
  if (!lease) throw new Error("Lease not found");

  return prisma.lease.update({
    where: { id: leaseId },
    data: input,
  });
}
