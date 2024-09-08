import { listProperties } from "@/modules/properties/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, MapPin } from "lucide-react";

export default async function PropertiesPage() {
  const ctx = await requireTenantContext();
  const properties = await listProperties(ctx.organizationId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-500">{properties.length} properties</p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Property
          </Button>
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No properties yet.</p>
          <Link href="/properties/new">
            <Button variant="outline" className="mt-4">Add your first property</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {properties.map((p) => {
            const total = p._count.units;
            const occupied = p.units.filter((u) => u.status === "OCCUPIED").length;
            const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

            return (
              <Link
                key={p.id}
                href={`/properties/${p.id}`}
                className="block border border-slate-200 rounded-lg bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2">
                      <Building2 className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">{p.name}</h2>
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {p.address}{p.city ? `, ${p.city}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "ACTIVE" ? "success" : "secondary"}>
                      {p.status}
                    </Badge>
                    <Badge variant="outline">{p.propertyType}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex gap-6 text-sm text-slate-600">
                  <span><span className="font-medium">{total}</span> units</span>
                  <span><span className="font-medium">{occupancyPct}%</span> occupied</span>
                  <span><span className="font-medium">{p._count.maintenanceRequests}</span> open requests</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
