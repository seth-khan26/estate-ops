import { listTenants } from "@/modules/tenants/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users } from "lucide-react";

export default async function TenantsPage() {
  const ctx = await requireTenantContext();
  const tenants = await listTenants(ctx.organizationId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants</h1>
          <p className="text-slate-500">{tenants.length} tenants</p>
        </div>
        <Link href="/tenants/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tenants yet.</p>
          <Link href="/tenants/new">
            <Button variant="outline" className="mt-4">Add your first tenant</Button>
          </Link>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Current Unit</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const activeLease = t.leases[0];
                return (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/tenants/${t.id}`} className="font-medium text-slate-900 hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.email}</td>
                    <td className="px-4 py-3 text-slate-600">{t.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {activeLease ? (
                        <span>
                          {activeLease.unit.property.name} · Unit {activeLease.unit.unitNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">No active lease</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.status === "ACTIVE" ? "success" : "secondary"}>
                        {t.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
