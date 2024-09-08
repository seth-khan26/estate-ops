import { listMaintenanceRequests } from "@/modules/maintenance/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  ASSIGNED: "outline",
  OPEN: "secondary",
  CANCELLED: "destructive",
};

const priorityColor: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
  EMERGENCY: "destructive",
};

export default async function MaintenancePage() {
  const ctx = await requireTenantContext();
  const requests = await listMaintenanceRequests(ctx.organizationId);

  const open = requests.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED");
  const done = requests.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-slate-500">{open.length} open requests</p>
        </div>
        <Link href="/maintenance/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-lg">
          <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No maintenance requests.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Open ({open.length})</h2>
              <div className="space-y-2">
                {open.map((req) => (
                  <Link
                    key={req.id}
                    href={`/maintenance/${req.id}`}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{req.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {req.property.name}{req.unit ? ` · Unit ${req.unit.unitNumber}` : ""}
                        {" · "}{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={priorityColor[req.priority] ?? "secondary"}>{req.priority}</Badge>
                      <Badge variant={statusColor[req.status] ?? "secondary"}>{req.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Completed ({done.length})</h2>
              <div className="space-y-2">
                {done.map((req) => (
                  <Link
                    key={req.id}
                    href={`/maintenance/${req.id}`}
                    className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-white opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{req.title}</p>
                      <p className="text-sm text-slate-400">{req.property.name}</p>
                    </div>
                    <Badge variant={statusColor[req.status] ?? "secondary"}>{req.status}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
