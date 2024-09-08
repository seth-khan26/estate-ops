import { getTenant } from "@/modules/tenants/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  try {
    const tenant = await getTenant(ctx.organizationId, id);
    const activeLease = tenant.leases.find((l) =>
      ["ACTIVE", "EXPIRING"].includes(l.status)
    );

    return (
      <div>
        <Link href="/tenants" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to tenants
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{tenant.name}</h1>
            <p className="text-slate-500">{tenant.email}{tenant.phone ? ` · ${tenant.phone}` : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={tenant.status === "ACTIVE" ? "success" : "secondary"}>
              {tenant.status}
            </Badge>
            {!activeLease && (
              <Link href={`/leases/new?tenantId=${tenant.id}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Lease
                </Button>
              </Link>
            )}
          </div>
        </div>

        {activeLease && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-green-800">Active Lease</p>
              <p className="text-sm text-green-700 mt-1">
                {activeLease.unit.property.name} · Unit {activeLease.unit.unitNumber}
                {" · "}${Number(activeLease.monthlyRent).toLocaleString()}/mo
                {" · "}Ends {format(new Date(activeLease.endDate), "MMM d, yyyy")}
              </p>
              <Link href={`/leases/${activeLease.id}`}>
                <Button variant="outline" size="sm" className="mt-2 border-green-300">
                  View lease
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Lease History</CardTitle></CardHeader>
            <CardContent>
              {tenant.leases.length === 0 ? (
                <p className="text-sm text-slate-400">No leases.</p>
              ) : (
                <div className="space-y-2">
                  {tenant.leases.map((l) => (
                    <Link
                      key={l.id}
                      href={`/leases/${l.id}`}
                      className="flex items-center justify-between p-3 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div className="text-sm">
                        <p className="font-medium">{l.unit.property.name} · Unit {l.unit.unitNumber}</p>
                        <p className="text-slate-500 text-xs">
                          {format(new Date(l.startDate), "MMM d, yyyy")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant={l.status === "ACTIVE" ? "success" : "secondary"}>{l.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Maintenance Requests</CardTitle></CardHeader>
            <CardContent>
              {tenant.maintenanceRequests.length === 0 ? (
                <p className="text-sm text-slate-400">No requests.</p>
              ) : (
                <div className="space-y-2">
                  {tenant.maintenanceRequests.map((r) => (
                    <Link
                      key={r.id}
                      href={`/maintenance/${r.id}`}
                      className="flex items-center justify-between p-3 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium">{r.title}</p>
                      <Badge variant={r.status === "COMPLETED" ? "success" : "secondary"}>{r.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
