import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { listLeases, createLease, createLeaseSchema } from "@/modules/leases/service";
import { LeaseStatus } from "@prisma/client";

export async function GET(request: Request) {
  return withAuth("leases.read", async (ctx) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as LeaseStatus | null;
    const leases = await listLeases(ctx.organizationId, status ? { status } : undefined);
    return ok(leases);
  });
}

export async function POST(request: Request) {
  return withAuth("leases.manage", async (ctx) => {
    const input = await parseBody(request, createLeaseSchema);
    const lease = await createLease(ctx.organizationId, ctx.userId, input);
    return ok(lease, 201);
  });
}
