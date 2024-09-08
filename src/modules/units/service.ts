import { prisma } from "@/lib/prisma";
import { audit } from "@/modules/audit/service";
import { UnitStatus } from "@prisma/client";
import { z } from "zod";

export const createUnitSchema = z.object({
  unitNumber: z.string().min(1).max(50),
  bedrooms: z.number().int().min(0).default(1),
  bathrooms: z.number().min(0).default(1),
  monthlyRent: z.number().positive(),
  status: z.nativeEnum(UnitStatus).default("VACANT"),
});

export const updateUnitSchema = createUnitSchema.partial();

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

export async function listUnits(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
  });
  if (!property) throw new Error("Property not found");

  return prisma.unit.findMany({
    where: { propertyId },
    include: {
      leases: {
        where: { status: { in: ["ACTIVE", "EXPIRING"] } },
        include: { tenant: true },
        take: 1,
      },
      _count: { select: { maintenanceRequests: true } },
    },
    orderBy: { unitNumber: "asc" },
  });
}

export async function getUnit(organizationId: string, unitId: string) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { organizationId } },
    include: {
      property: true,
      leases: {
        include: {
          tenant: true,
          rentCharges: {
            orderBy: { dueDate: "desc" },
            take: 12,
            include: { payments: true },
          },
        },
        orderBy: { startDate: "desc" },
        take: 5,
      },
      maintenanceRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!unit) throw new Error("Unit not found");
  return unit;
}

export async function createUnit(
  organizationId: string,
  actorUserId: string,
  propertyId: string,
  input: CreateUnitInput
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
  });
  if (!property) throw new Error("Property not found");

  const unit = await prisma.unit.create({
    data: { ...input, propertyId },
  });

  await audit({
    organizationId,
    actorUserId,
    action: "unit.created",
    resourceType: "unit",
    resourceId: unit.id,
  });

  return unit;
}

export async function updateUnit(
  organizationId: string,
  actorUserId: string,
  unitId: string,
  input: UpdateUnitInput
) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, property: { organizationId } },
  });
  if (!unit) throw new Error("Unit not found");

  const updated = await prisma.unit.update({
    where: { id: unitId },
    data: input,
  });

  await audit({
    organizationId,
    actorUserId,
    action: "unit.updated",
    resourceType: "unit",
    resourceId: unitId,
    metadata: input as Record<string, unknown>,
  });

  return updated;
}
