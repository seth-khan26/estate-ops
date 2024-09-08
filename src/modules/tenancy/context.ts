import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@prisma/client";

export type TenantContext = {
  userId: string;
  organizationId: string;
  role: MemberRole;
  ownerId?: string | null;
  tenantId?: string | null;
};

export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    role: membership.role,
    ownerId: membership.ownerId,
    tenantId: membership.tenantId,
  };
}

export async function requireTenantContext(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}
