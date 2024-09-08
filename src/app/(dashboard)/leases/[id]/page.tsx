import { getLease } from "@/modules/leases/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { LeaseActions } from "@/components/shared/lease-actions";
import { RecordPaymentForm } from "@/components/shared/record-payment-form";

const statusColor: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  ACTIVE: "success",
  EXPIRING: "warning",
  DRAFT: "outline",
  PENDING_SIGNATURE: "secondary",
  ENDED: "secondary",
  TERMINATED: "destructive",
};

const chargeStatusColor: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  OVERDUE: "destructive",
  PENDING: "secondary",
};

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  try {
    const lease = await getLease(ctx.organizationId, id);

    return (
      <div>
        <Link href="/leases" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to leases
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{lease.tenant.name}</h1>
            <p className="text-slate-500">
              {lease.unit.property.name} · Unit {lease.unit.unitNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={statusColor[lease.status] ?? "secondary"}>{lease.status}</Badge>
            <LeaseActions lease={lease} />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Lease Details</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Start date</dt>
                    <dd className="font-medium mt-0.5">{format(new Date(lease.startDate), "MMMM d, yyyy")}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">End date</dt>
                    <dd className="font-medium mt-0.5">{format(new Date(lease.endDate), "MMMM d, yyyy")}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Monthly rent</dt>
                    <dd className="font-medium mt-0.5">${Number(lease.monthlyRent).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Security deposit</dt>
                    <dd className="font-medium mt-0.5">${Number(lease.securityDeposit).toLocaleString()}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Rent Charges</CardTitle></CardHeader>
              <CardContent>
                {lease.rentCharges.length === 0 ? (
                  <p className="text-sm text-slate-400">No charges yet.</p>
                ) : (
                  <div className="space-y-2">
                    {lease.rentCharges.map((charge) => {
                      const paid = charge.payments.reduce((s, p) => s + Number(p.amount), 0);
                      return (
                        <div key={charge.id} className="flex items-center justify-between p-3 rounded-md border border-slate-100">
                          <div className="text-sm">
                            <p className="font-medium">{charge.billingPeriod}</p>
                            <p className="text-slate-500 text-xs">Due {format(new Date(charge.dueDate), "MMM d")}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-medium">${Number(charge.amount).toLocaleString()}</p>
                            {paid > 0 && (
                              <p className="text-xs text-slate-500">${paid.toLocaleString()} paid</p>
                            )}
                          </div>
                          <Badge variant={chargeStatusColor[charge.status] ?? "secondary"}>
                            {charge.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {lease.status === "ACTIVE" || lease.status === "EXPIRING" ? (
              <RecordPaymentForm
                charges={lease.rentCharges
                .filter((c) => c.status !== "PAID")
                .map((c) => ({ ...c, amount: Number(c.amount) }))}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
