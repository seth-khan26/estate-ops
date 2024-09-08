import { prisma } from "@/lib/prisma";

type NotificationType =
  | "lease.expiring"
  | "rent.due"
  | "rent.overdue"
  | "maintenance.created"
  | "maintenance.assigned"
  | "maintenance.completed"
  | "user.invited";

type NotifyParams = {
  organizationId: string;
  userId?: string;
  type: NotificationType;
  subject: string;
  body: string;
};

export async function enqueueNotification(params: NotifyParams) {
  await prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      type: params.type,
      subject: params.subject,
      body: params.body,
      status: "PENDING",
    },
  });
}

export async function processNotifications() {
  const pending = await prisma.notification.findMany({
    where: { status: "PENDING" },
    take: 50,
  });

  for (const n of pending) {
    try {
      // In production: send via email provider (SendGrid, Resend, etc.)
      // For MVP: just mark as sent
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch {
      await prisma.notification.update({
        where: { id: n.id },
        data: { status: "FAILED" },
      });
    }
  }
}
