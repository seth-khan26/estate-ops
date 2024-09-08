import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const createOwnerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const updateOwnerSchema = createOwnerSchema.partial();

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export type UpdateOwnerInput = z.infer<typeof updateOwnerSchema>;

export async function listOwners(organizationId: string) {
  return prisma.owner.findMany({
    where: { organizationId },
    include: {
      propertyOwners: {
        include: {
          property: { select: { id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getOwner(organizationId: string, ownerId: string) {
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, organizationId },
    include: {
      propertyOwners: {
        include: {
          property: {
            include: {
              units: { select: { id: true, status: true, monthlyRent: true } },
            },
          },
        },
      },
    },
  });
  if (!owner) throw new Error("Owner not found");
  return owner;
}

export async function createOwner(
  organizationId: string,
  input: CreateOwnerInput
) {
  return prisma.owner.create({
    data: { ...input, organizationId },
  });
}

export async function updateOwner(
  organizationId: string,
  ownerId: string,
  input: UpdateOwnerInput
) {
  const owner = await prisma.owner.findFirst({
    where: { id: ownerId, organizationId },
  });
  if (!owner) throw new Error("Owner not found");

  return prisma.owner.update({
    where: { id: ownerId },
    data: input,
  });
}

export async function assignPropertyOwner(
  organizationId: string,
  propertyId: string,
  ownerId: string,
  ownershipPercentage: number
) {
  // Verify both belong to org
  const [property, owner] = await Promise.all([
    prisma.property.findFirst({ where: { id: propertyId, organizationId } }),
    prisma.owner.findFirst({ where: { id: ownerId, organizationId } }),
  ]);
  if (!property || !owner) throw new Error("Property or owner not found");

  return prisma.propertyOwner.upsert({
    where: { propertyId_ownerId: { propertyId, ownerId } },
    create: { propertyId, ownerId, ownershipPercentage },
    update: { ownershipPercentage },
  });
}
