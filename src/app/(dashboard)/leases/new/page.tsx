"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NewLeasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    unitId: searchParams.get("unitId") ?? "",
    tenantId: "",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
  });
  const [units, setUnits] = useState<{ id: string; unitNumber: string; property: { name: string }; monthlyRent: number }[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then((r) => r.json()),
      fetch("/api/tenants").then((r) => r.json()),
    ]).then(([props, tens]) => {
      const allUnits = props.flatMap((p: { units?: typeof units; name: string }) =>
        (p.units ?? []).map((u: typeof units[0]) => ({ ...u, property: { name: p.name } }))
      );
      setUnits(allUnits);
      setTenants(tens);
    });
  }, []);

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "unitId") {
        const unit = units.find((u) => u.id === value);
        if (unit) next.monthlyRent = String(unit.monthlyRent);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/leases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        monthlyRent: parseFloat(form.monthlyRent),
        securityDeposit: parseFloat(form.securityDeposit || "0"),
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
      setLoading(false);
      return;
    }

    const lease = await res.json();
    router.push(`/leases/${lease.id}`);
  }

  return (
    <div className="max-w-xl">
      <Link href="/leases" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to leases
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Lease</h1>
      <Card>
        <CardHeader><CardTitle>Lease details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <div className="space-y-2">
              <Label>Unit *</Label>
              <select
                value={form.unitId}
                onChange={(e) => set("unitId", e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select a unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.property.name} · Unit {u.unitNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tenant *</Label>
              <select
                value={form.tenantId}
                onChange={(e) => set("tenantId", e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select a tenant</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>End date *</Label>
                <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monthly rent ($) *</Label>
                <Input type="number" min="0" value={form.monthlyRent} onChange={(e) => set("monthlyRent", e.target.value)} required placeholder="1500" />
              </div>
              <div className="space-y-2">
                <Label>Security deposit ($)</Label>
                <Input type="number" min="0" value={form.securityDeposit} onChange={(e) => set("securityDeposit", e.target.value)} placeholder="1500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create lease"}</Button>
              <Link href="/leases"><Button variant="outline" type="button">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
