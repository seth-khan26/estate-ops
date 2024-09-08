import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { listTenants, createTenant, createTenantSchema } from "@/modules/tenants/service";

export async function GET() {
  return withAuth("tenants.read", async (ctx) => {
    const tenants = await listTenants(ctx.organizationId);
    return ok(tenants);
  });
}

export async function POST(request: Request) {
  return withAuth("tenants.manage", async (ctx) => {
    const input = await parseBody(request, createTenantSchema);
    const tenant = await createTenant(ctx.organizationId, ctx.userId, input);
    return ok(tenant, 201);
  });
}
