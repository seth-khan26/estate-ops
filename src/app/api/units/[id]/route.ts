import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { getUnit, updateUnit, updateUnitSchema } from "@/modules/units/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("units.read", async (ctx) => {
    const { id } = await params;
    const unit = await getUnit(ctx.organizationId, id);
    return ok(unit);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("units.manage", async (ctx) => {
    const { id } = await params;
    const input = await parseBody(request, updateUnitSchema);
    const unit = await updateUnit(ctx.organizationId, ctx.userId, id, input);
    return ok(unit);
  });
}
