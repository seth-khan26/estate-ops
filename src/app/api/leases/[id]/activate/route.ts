import { withAuth, ok } from "@/lib/api-helpers";
import { activateLease } from "@/modules/leases/service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("leases.manage", async (ctx) => {
    const { id } = await params;
    const lease = await activateLease(ctx.organizationId, ctx.userId, id);
    return ok(lease);
  });
}
