"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NewMaintenancePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    propertyId: "",
    unitId: "",
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [properties, setProperties] = useState<{ id: string; name: string; units: { id: string; unitNumber: string }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/properties").then((r) => r.json()).then(setProperties);
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selectedProperty = properties.find((p) => p.id === form.propertyId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, string> = {
      propertyId: form.propertyId,
      title: form.title,
      description: form.description,
      priority: form.priority,
    };
    if (form.unitId) body.unitId = form.unitId;

    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
      setLoading(false);
      return;
    }

    const req = await res.json();
    router.push(`/maintenance/${req.id}`);
  }

  return (
    <div className="max-w-xl">
      <Link href="/maintenance" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to maintenance
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Maintenance Request</h1>
      <Card>
        <CardHeader><CardTitle>Request details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
            <div className="space-y-2">
              <Label>Property *</Label>
              <select
                value={form.propertyId}
                onChange={(e) => set("propertyId", e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {selectedProperty && selectedProperty.units.length > 0 && (
              <div className="space-y-2">
                <Label>Unit (optional)</Label>
                <select
                  value={form.unitId}
                  onChange={(e) => set("unitId", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">— Select unit —</option>
                  {selectedProperty.units.map((u) => (
                    <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="Leaking faucet in kitchen" />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
                rows={4}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Describe the issue in detail..."
              />
            </div>
            <div className="space-y-2">
              <Label>Priority *</Label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit request"}</Button>
              <Link href="/maintenance"><Button variant="outline" type="button">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
