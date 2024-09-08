import { listOwners } from "@/modules/owners/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, UserCog } from "lucide-react";
import { AddOwnerForm } from "@/components/shared/add-owner-form";

export default async function OwnersPage() {
  const ctx = await requireTenantContext();
  const owners = await listOwners(ctx.organizationId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Property Owners</h1>
          <p className="text-slate-500">{owners.length} owners</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {owners.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
              <UserCog className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No property owners added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {owners.map((owner) => (
                <Card key={owner.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{owner.name}</p>
                        <p className="text-sm text-slate-500">{owner.email}</p>
                        {owner.phone && <p className="text-sm text-slate-500">{owner.phone}</p>}
                      </div>
                    </div>
                    {owner.propertyOwners.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {owner.propertyOwners.map((po) => (
                          <span
                            key={po.id}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                          >
                            {po.property.name} ({Number(po.ownershipPercentage)}%)
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div>
          <AddOwnerForm />
        </div>
      </div>
    </div>
  );
}
