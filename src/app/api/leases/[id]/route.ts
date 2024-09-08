import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { getLease, updateLease, updateLeaseSchema } from "@/modules/leases/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("leases.read", async (ctx) => {
    const { id } = await params;
    const lease = await getLease(ctx.organizationId, id);
    return ok(lease);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("leases.manage", async (ctx) => {
    const { id } = await params;
    const input = await parseBody(request, updateLeaseSchema);
    const lease = await updateLease(ctx.organizationId, ctx.userId, id, input);
    return ok(lease);
  });
}
