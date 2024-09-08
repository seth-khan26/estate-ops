import { listLeases } from "@/modules/leases/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";

const statusColor: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  ACTIVE: "success",
  EXPIRING: "warning",
  DRAFT: "outline",
  PENDING_SIGNATURE: "secondary",
  ENDED: "secondary",
  TERMINATED: "destructive",
};

export default async function LeasesPage() {
  const ctx = await requireTenantContext();
  const leases = await listLeases(ctx.organizationId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leases</h1>
          <p className="text-slate-500">{leases.length} leases</p>
        </div>
        <Link href="/leases/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Lease
          </Button>
        </Link>
      </div>

      {leases.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No leases yet.</p>
          <Link href="/leases/new">
            <Button variant="outline" className="mt-4">Create first lease</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Unit</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Rent</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/leases/${l.id}`} className="font-medium text-slate-900 hover:underline">
                      {l.tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.unit.property.name} · Unit {l.unit.unitNumber}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    ${Number(l.monthlyRent).toLocaleString()}/mo
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {format(new Date(l.startDate), "MMM d, yyyy")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusColor[l.status] ?? "secondary"}>{l.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
