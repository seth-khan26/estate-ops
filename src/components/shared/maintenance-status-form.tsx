"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const transitions: Record<Status, Status[]> = {
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function MaintenanceStatusForm({
  request,
}: {
  request: { id: string; status: Status; assignedTo: string | null };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const next = transitions[request.status] ?? [];

  async function updateStatus(status: Status) {
    setLoading(status);
    setError("");
    const res = await fetch(`/api/maintenance/${request.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Failed");
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  if (next.length === 0) return null;

  const statusLabels: Record<Status, string> = {
    OPEN: "Re-open",
    ASSIGNED: "Mark Assigned",
    IN_PROGRESS: "Mark In Progress",
    COMPLETED: "Mark Completed",
    CANCELLED: "Cancel",
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {next.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={status === "CANCELLED" ? "destructive" : status === "COMPLETED" ? "default" : "outline"}
            className="w-full"
            onClick={() => updateStatus(status)}
            disabled={loading === status}
          >
            {loading === status ? "Updating..." : statusLabels[status]}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
