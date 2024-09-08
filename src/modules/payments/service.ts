import { prisma } from "@/lib/prisma";
import { audit } from "@/modules/audit/service";
import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const recordPaymentSchema = z.object({
  rentChargeId: z.string().min(1),
  amount: z.number().positive(),
  paidAt: z.coerce.date().default(() => new Date()),
  method: z.nativeEnum(PaymentMethod).default("OTHER"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export async function listRentCharges(
  organizationId: string,
  leaseId?: string
) {
  return prisma.rentCharge.findMany({
    where: {
      organizationId,
      ...(leaseId && { leaseId }),
    },
    include: {
      lease: { include: { tenant: true, unit: { include: { property: true } } } },
      payments: true,
    },
    orderBy: { dueDate: "desc" },
  });
}

export async function recordPayment(
  organizationId: string,
  actorUserId: string,
  input: RecordPaymentInput
) {
  // Transactional: lock charge → validate → create → update status → audit
  return prisma.$transaction(async (tx) => {
    // Lock the charge row
    const charge = await tx.rentCharge.findFirst({
      where: { id: input.rentChargeId, organizationId },
      include: { payments: true },
    });
    if (!charge) throw new Error("Rent charge not found");
    if (charge.status === "PAID") throw new Error("Charge is already paid");

    // Calculate remaining balance
    const totalPaid = charge.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const remaining = Number(charge.amount) - totalPaid;
    if (input.amount > remaining + 0.01) {
      throw new Error(
        `Payment amount exceeds remaining balance of $${remaining.toFixed(2)}`
      );
    }

    // Create payment
    const payment = await tx.payment.create({
      data: {
        organizationId,
        rentChargeId: input.rentChargeId,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
      },
    });

    // Update charge status
    const newTotalPaid = totalPaid + input.amount;
    const newStatus =
      newTotalPaid >= Number(charge.amount) - 0.01
        ? "PAID"
        : "PARTIALLY_PAID";

    await tx.rentCharge.update({
      where: { id: input.rentChargeId },
      data: { status: newStatus, updatedAt: new Date() },
    });

    // Audit inside transaction
    await tx.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: "payment.recorded",
        resourceType: "payment",
        resourceId: payment.id,
        metadata: { rentChargeId: input.rentChargeId, amount: input.amount },
      },
    });

    return payment;
  });
}

export async function generateMonthlyCharges(organizationId: string) {
  const now = new Date();
  const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const activeLeases = await prisma.lease.findMany({
    where: { organizationId, status: { in: ["ACTIVE", "EXPIRING"] } },
  });

  const results = { created: 0, skipped: 0 };

  for (const lease of activeLeases) {
    try {
      await prisma.rentCharge.create({
        data: {
          organizationId,
          leaseId: lease.id,
          billingPeriod,
          amount: lease.monthlyRent,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
          status: "PENDING",
        },
      });
      results.created++;
    } catch {
      // UNIQUE(leaseId, billingPeriod) — already generated
      results.skipped++;
    }
  }

  return results;
}

export async function markOverdueCharges(organizationId: string) {
  const now = new Date();
  return prisma.rentCharge.updateMany({
    where: {
      organizationId,
      status: { in: ["PENDING", "PARTIALLY_PAID"] },
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
}
