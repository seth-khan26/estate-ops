import { prisma } from "@/lib/prisma";
import { audit } from "@/modules/audit/service";
import { PropertyStatus, PropertyType } from "@prisma/client";
import { z } from "zod";

export const createPropertySchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  propertyType: z.nativeEnum(PropertyType).default("RESIDENTIAL"),
});

export const updatePropertySchema = createPropertySchema.partial().extend({
  status: z.nativeEnum(PropertyStatus).optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export async function listProperties(organizationId: string) {
  return prisma.property.findMany({
    where: { organizationId },
    include: {
      units: { select: { id: true, status: true } },
      propertyOwners: { include: { owner: true } },
      _count: { select: { units: true, maintenanceRequests: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProperty(organizationId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
    include: {
      units: {
        include: {
          leases: {
            where: { status: { in: ["ACTIVE", "EXPIRING"] } },
            include: { tenant: true },
            take: 1,
          },
        },
      },
      propertyOwners: { include: { owner: true } },
      maintenanceRequests: {
        where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
  if (!property) throw new Error("Property not found");
  return property;
}

export async function createProperty(
  organizationId: string,
  actorUserId: string,
  input: CreatePropertyInput
) {
  const property = await prisma.property.create({
    data: { ...input, organizationId },
  });

  await audit({
    organizationId,
    actorUserId,
    action: "property.created",
    resourceType: "property",
    resourceId: property.id,
  });

  return property;
}

export async function updateProperty(
  organizationId: string,
  actorUserId: string,
  propertyId: string,
  input: UpdatePropertyInput
) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId },
  });
  if (!property) throw new Error("Property not found");

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: input,
  });

  await audit({
    organizationId,
    actorUserId,
    action: "property.updated",
    resourceType: "property",
    resourceId: propertyId,
    metadata: input as Record<string, unknown>,
  });

  return updated;
}

export async function getDashboardStats(organizationId: string) {
  const [properties, units, activeLeases, openMaintenance, outstandingCharges] =
    await Promise.all([
      prisma.property.count({ where: { organizationId, status: "ACTIVE" } }),
      prisma.unit.count({
        where: { property: { organizationId } },
      }),
      prisma.lease.count({
        where: { organizationId, status: { in: ["ACTIVE", "EXPIRING"] } },
      }),
      prisma.maintenanceRequest.count({
        where: {
          organizationId,
          status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
        },
      }),
      prisma.rentCharge.aggregate({
        where: {
          organizationId,
          status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
        },
        _sum: { amount: true },
      }),
    ]);

  const occupiedUnits = await prisma.unit.count({
    where: { property: { organizationId }, status: "OCCUPIED" },
  });

  const monthlyRent = await prisma.lease.aggregate({
    where: { organizationId, status: { in: ["ACTIVE", "EXPIRING"] } },
    _sum: { monthlyRent: true },
  });

  const expiringLeases = await prisma.lease.count({
    where: { organizationId, status: "EXPIRING" },
  });

  return {
    properties,
    units,
    occupancyRate: units > 0 ? Math.round((occupiedUnits / units) * 100) : 0,
    monthlyRent: Number(monthlyRent._sum.monthlyRent ?? 0),
    outstandingRent: Number(outstandingCharges._sum.amount ?? 0),
    openMaintenance,
    activeLeases,
    expiringLeases,
  };
}
