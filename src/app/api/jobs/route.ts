import { NextResponse } from "next/server";
import { checkExpiringLeases, generateAllMonthlyCharges } from "@/modules/jobs/lease-jobs";

// In production this would be triggered by a cron job (Vercel cron, crontab, etc.)
// Secret header guards against unauthorized invocations
export async function POST(request: Request) {
  const secret = request.headers.get("x-job-secret");
  if (secret !== process.env.JOB_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const job = url.searchParams.get("job");

  try {
    if (job === "expiring-leases") {
      await checkExpiringLeases();
      return NextResponse.json({ ok: true, job });
    }
    if (job === "monthly-charges") {
      await generateAllMonthlyCharges();
      return NextResponse.json({ ok: true, job });
    }
    return NextResponse.json({ error: "Unknown job" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
