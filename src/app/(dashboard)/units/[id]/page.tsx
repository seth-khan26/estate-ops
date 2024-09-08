import { getUnit } from "@/modules/units/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";

const unitStatusColor: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  VACANT: "success",
  OCCUPIED: "secondary",
  MAINTENANCE: "warning",
  UNAVAILABLE: "destructive",
};

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  try {
    const unit = await getUnit(ctx.organizationId, id);
    const activeLease = unit.leases.find((l) =>
      ["ACTIVE", "EXPIRING"].includes(l.status)
    );

    return (
      <div>
        <Link
          href={`/properties/${unit.propertyId}`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {unit.property.name}
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Unit {unit.unitNumber}</h1>
            <p className="text-slate-500">
              {unit.property.name} · {unit.bedrooms}bd · {Number(unit.bathrooms)}ba ·{" "}
              ${Number(unit.monthlyRent).toLocaleString()}/mo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={unitStatusColor[unit.status] ?? "secondary"}>{unit.status}</Badge>
            {unit.status === "VACANT" && (
              <Link href={`/leases/new?unitId=${unit.id}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Lease
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Lease History</CardTitle></CardHeader>
            <CardContent>
              {unit.leases.length === 0 ? (
                <p className="text-sm text-slate-400">No leases for this unit.</p>
              ) : (
                <div className="space-y-3">
                  {unit.leases.map((l) => (
                    <Link
                      key={l.id}
                      href={`/leases/${l.id}`}
                      className="block p-3 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{l.tenant.name}</p>
                        <Badge variant={l.status === "ACTIVE" ? "success" : "secondary"}>
                          {l.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {format(new Date(l.startDate), "MMM d, yyyy")} –{" "}
                        {format(new Date(l.endDate), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ${Number(l.monthlyRent).toLocaleString()}/mo · {l.rentCharges.length} charges
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Maintenance</CardTitle></CardHeader>
            <CardContent>
              {unit.maintenanceRequests.length === 0 ? (
                <p className="text-sm text-slate-400">No maintenance requests.</p>
              ) : (
                <div className="space-y-2">
                  {unit.maintenanceRequests.map((r) => (
                    <Link
                      key={r.id}
                      href={`/maintenance/${r.id}`}
                      className="flex items-center justify-between p-3 rounded-md border border-slate-100 hover:border-slate-200"
                    >
                      <p className="text-sm font-medium">{r.title}</p>
                      <Badge variant={r.status === "COMPLETED" ? "success" : "secondary"}>
                        {r.status}
                      </Badge>
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
