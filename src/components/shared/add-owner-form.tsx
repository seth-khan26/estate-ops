"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AddOwnerForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setForm({ name: "", email: "", phone: "" });
    router.refresh();
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Add Owner</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Owner added!</p>}
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="John Smith" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="john@example.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add owner"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
