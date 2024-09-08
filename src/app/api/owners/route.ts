import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { listOwners, createOwner, createOwnerSchema } from "@/modules/owners/service";

export async function GET() {
  return withAuth("owners.read", async (ctx) => {
    const owners = await listOwners(ctx.organizationId);
    return ok(owners);
  });
}

export async function POST(request: Request) {
  return withAuth("owners.manage", async (ctx) => {
    const input = await parseBody(request, createOwnerSchema);
    const owner = await createOwner(ctx.organizationId, input);
    return ok(owner, 201);
  });
}
