"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type LeaseStatus = "DRAFT" | "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRING" | "ENDED" | "TERMINATED";

export function LeaseActions({ lease }: { lease: { id: string; status: LeaseStatus } }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function activate() {
    setLoading("activate");
    setError("");
    const res = await fetch(`/api/leases/${lease.id}/activate`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  async function terminate() {
    if (!confirm("Terminate this lease? This will mark the unit as vacant.")) return;
    setLoading("terminate");
    setError("");
    const res = await fetch(`/api/leases/${lease.id}/terminate`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        {(lease.status === "DRAFT" || lease.status === "PENDING_SIGNATURE") && (
          <Button size="sm" onClick={activate} disabled={loading === "activate"}>
            {loading === "activate" ? "Activating..." : "Activate Lease"}
          </Button>
        )}
        {(lease.status === "ACTIVE" || lease.status === "EXPIRING") && (
          <Button size="sm" variant="destructive" onClick={terminate} disabled={loading === "terminate"}>
            {loading === "terminate" ? "Terminating..." : "Terminate"}
          </Button>
        )}
      </div>
    </div>
  );
}
