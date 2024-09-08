import { requireTenantContext } from "@/modules/tenancy/context";
import { listRentCharges } from "@/modules/payments/service";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format } from "date-fns";

const statusColor: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  PARTIALLY_PAID: "warning",
  OVERDUE: "destructive",
  PENDING: "secondary",
};

export default async function PaymentsPage() {
  const ctx = await requireTenantContext();
  const charges = await listRentCharges(ctx.organizationId);

  const outstanding = charges.filter((c) => c.status !== "PAID");
  const paid = charges.filter((c) => c.status === "PAID");

  const totalOutstanding = outstanding.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500">{charges.length} rent charges</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Outstanding</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ${totalOutstanding.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {outstanding.filter((c) => c.status === "OVERDUE").length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Paid this month</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {paid.filter((c) => c.billingPeriod === new Date().toISOString().slice(0, 7)).length}
          </p>
        </div>
      </div>

      {outstanding.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">
            Outstanding ({outstanding.length})
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Due</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((charge) => (
                  <tr key={charge.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/leases/${charge.leaseId}`} className="font-medium text-slate-900 hover:underline">
                        {charge.lease.tenant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {charge.lease.unit.property.name} · Unit {charge.lease.unit.unitNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{charge.billingPeriod}</td>
                    <td className="px-4 py-3 font-medium">${Number(charge.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {format(new Date(charge.dueDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor[charge.status] ?? "secondary"}>{charge.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
