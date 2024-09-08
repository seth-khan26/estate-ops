import { getProperty } from "@/modules/properties/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, DoorOpen, Wrench } from "lucide-react";
import { AddUnitForm } from "@/components/shared/add-unit-form";

const unitStatusColor: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  VACANT: "success",
  OCCUPIED: "secondary",
  MAINTENANCE: "warning",
  UNAVAILABLE: "destructive",
};

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  try {
    const property = await getProperty(ctx.organizationId, id);

    const totalUnits = property.units.length;
    const occupied = property.units.filter((u) => u.status === "OCCUPIED").length;

    return (
      <div>
        <Link href="/properties" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{property.name}</h1>
            <p className="text-slate-500">{property.address}{property.city ? `, ${property.city}` : ""}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={property.status === "ACTIVE" ? "success" : "secondary"}>{property.status}</Badge>
            <Badge variant="outline">{property.propertyType}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Total Units</p>
              <p className="text-2xl font-bold">{totalUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Occupied</p>
              <p className="text-2xl font-bold">{occupied}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">Occupancy</p>
              <p className="text-2xl font-bold">
                {totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Units</CardTitle>
              </CardHeader>
              <CardContent>
                {property.units.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <DoorOpen className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No units yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {property.units.map((unit) => {
                      const activeLease = unit.leases[0];
                      return (
                        <Link
                          key={unit.id}
                          href={`/units/${unit.id}`}
                          className="flex items-center justify-between p-3 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <span className="font-medium text-sm">Unit {unit.unitNumber}</span>
                            <span className="text-slate-400 text-xs ml-2">
                              {unit.bedrooms}bd · {Number(unit.bathrooms)}ba · ${Number(unit.monthlyRent).toLocaleString()}/mo
                            </span>
                            {activeLease && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {activeLease.tenant.name}
                              </p>
                            )}
                          </div>
                          <Badge variant={unitStatusColor[unit.status] ?? "secondary"}>
                            {unit.status}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <AddUnitForm propertyId={property.id} />

            {property.maintenanceRequests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-4 w-4" />
                    Open Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {property.maintenanceRequests.map((req) => (
                      <Link
                        key={req.id}
                        href={`/maintenance/${req.id}`}
                        className="block text-sm text-slate-700 hover:text-slate-900"
                      >
                        <span className="font-medium">{req.title}</span>
                        <span className="text-slate-400 text-xs ml-2">{req.status}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
