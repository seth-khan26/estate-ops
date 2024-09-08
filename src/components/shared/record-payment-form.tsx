"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Charge = {
  id: string;
  billingPeriod: string;
  amount: number | string;
  status: string;
};

export function RecordPaymentForm({ charges }: { charges: Charge[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    rentChargeId: charges[0]?.id ?? "",
    amount: "",
    method: "OTHER",
    reference: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Payment failed");
      setLoading(false);
      return;
    }

    setSuccess("Payment recorded");
    setForm((f) => ({ ...f, amount: "", reference: "" }));
    router.refresh();
    setLoading(false);
  }

  if (charges.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <div className="space-y-1">
            <Label className="text-xs">Charge</Label>
            <select
              value={form.rentChargeId}
              onChange={(e) => set("rentChargeId", e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {charges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.billingPeriod} — ${Number(c.amount).toLocaleString()} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount ($)</Label>
            <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Method</Label>
            <select
              value={form.method}
              onChange={(e) => set("method", e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reference</Label>
            <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Check #, transaction ID..." />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={loading}>
            {loading ? "Recording..." : "Record payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
