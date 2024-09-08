import { prisma } from "@/lib/prisma";
import { enqueueNotification } from "@/modules/notifications/service";
import { generateMonthlyCharges, markOverdueCharges } from "@/modules/payments/service";
import { addDays, isBefore } from "date-fns";

// Mark leases expiring within 30 days
export async function checkExpiringLeases() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });

  for (const org of orgs) {
    const soon = addDays(new Date(), 30);
    const expiring = await prisma.lease.findMany({
      where: {
        organizationId: org.id,
        status: "ACTIVE",
        endDate: { lte: soon },
      },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    for (const lease of expiring) {
      await prisma.lease.update({
        where: { id: lease.id },
        data: { status: "EXPIRING" },
      });

      await enqueueNotification({
        organizationId: org.id,
        type: "lease.expiring",
        subject: `Lease expiring soon: ${lease.tenant.name}`,
        body: `Lease for ${lease.tenant.name} at ${lease.unit.property.name} Unit ${lease.unit.unitNumber} expires on ${lease.endDate.toDateString()}.`,
      });
    }

    // Mark ended leases
    await prisma.lease.updateMany({
      where: {
        organizationId: org.id,
        status: { in: ["ACTIVE", "EXPIRING"] },
        endDate: { lt: new Date() },
      },
      data: { status: "ENDED" },
    });
  }
}

// Generate rent charges (monthly, idempotent)
export async function generateAllMonthlyCharges() {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const org of orgs) {
    await generateMonthlyCharges(org.id);
    await markOverdueCharges(org.id);
  }
}
