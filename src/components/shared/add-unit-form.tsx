"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export function AddUnitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    unitNumber: "",
    bedrooms: "1",
    bathrooms: "1",
    monthlyRent: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/properties/${propertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseFloat(form.bathrooms),
        monthlyRent: parseFloat(form.monthlyRent),
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
      setLoading(false);
      return;
    }

    setOpen(false);
    setForm({ unitNumber: "", bedrooms: "1", bathrooms: "1", monthlyRent: "" });
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Unit
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Unit</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-1">
            <Label className="text-xs">Unit Number *</Label>
            <Input value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="101" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Bedrooms</Label>
              <Input type="number" min="0" value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bathrooms</Label>
              <Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Monthly Rent ($) *</Label>
            <Input type="number" min="0" value={form.monthlyRent} onChange={(e) => set("monthlyRent", e.target.value)} placeholder="1500" required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>{loading ? "Adding..." : "Add unit"}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
