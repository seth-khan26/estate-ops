import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { getTenant, updateTenant, updateTenantSchema } from "@/modules/tenants/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("tenants.read", async (ctx) => {
    const { id } = await params;
    const tenant = await getTenant(ctx.organizationId, id);
    return ok(tenant);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("tenants.manage", async (ctx) => {
    const { id } = await params;
    const input = await parseBody(request, updateTenantSchema);
    const tenant = await updateTenant(ctx.organizationId, ctx.userId, id, input);
    return ok(tenant);
  });
}
