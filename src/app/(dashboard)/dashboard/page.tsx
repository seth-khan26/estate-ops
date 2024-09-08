import { getDashboardStats } from "@/modules/properties/service";
import { requireTenantContext } from "@/modules/tenancy/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  DoorOpen,
  TrendingUp,
  AlertCircle,
  Wrench,
  Clock,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color = "slate",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <div className="rounded-full bg-slate-100 p-2">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const stats = await getDashboardStats(ctx.organizationId);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
      <p className="text-slate-500 mb-8">Overview of your portfolio</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Properties"
          value={String(stats.properties)}
          icon={Building2}
        />
        <StatCard
          label="Units"
          value={String(stats.units)}
          icon={DoorOpen}
          sub={`${stats.occupancyRate}% occupied`}
        />
        <StatCard
          label="Monthly Rent"
          value={fmt(stats.monthlyRent)}
          icon={TrendingUp}
          sub={`${stats.activeLeases} active leases`}
        />
        <StatCard
          label="Outstanding"
          value={fmt(stats.outstandingRent)}
          icon={AlertCircle}
        />
        <StatCard
          label="Open Maintenance"
          value={String(stats.openMaintenance)}
          icon={Wrench}
        />
        <StatCard
          label="Expiring Leases"
          value={String(stats.expiringLeases)}
          icon={Clock}
          sub="within 30 days"
        />
      </div>
    </div>
  );
}
