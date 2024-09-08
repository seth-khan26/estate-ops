import { getMaintenanceRequest } from "@/modules/maintenance/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { MaintenanceStatusForm } from "@/components/shared/maintenance-status-form";

const priorityColor: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
  EMERGENCY: "destructive",
};

const statusColor: Record<string, "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  COMPLETED: "success",
  IN_PROGRESS: "warning",
  ASSIGNED: "outline",
  OPEN: "secondary",
  CANCELLED: "destructive",
};

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireTenantContext();
  const { id } = await params;

  try {
    const req = await getMaintenanceRequest(ctx.organizationId, id);

    return (
      <div>
        <Link href="/maintenance" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to maintenance
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{req.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {req.property.name}{req.unit ? ` · Unit ${req.unit.unitNumber}` : ""}
              {" · "}Submitted {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant={priorityColor[req.priority] ?? "secondary"}>{req.priority}</Badge>
            <Badge variant={statusColor[req.status] ?? "secondary"}>{req.status}</Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.description}</p>
              </CardContent>
            </Card>

            {req.completedAt && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-green-700">
                    Completed on {format(new Date(req.completedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <MaintenanceStatusForm request={req} />
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
