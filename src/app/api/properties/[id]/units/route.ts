import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { listUnits, createUnit, createUnitSchema } from "@/modules/units/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("units.read", async (ctx) => {
    const { id } = await params;
    const units = await listUnits(ctx.organizationId, id);
    return ok(units);
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("units.manage", async (ctx) => {
    const { id } = await params;
    const input = await parseBody(request, createUnitSchema);
    const unit = await createUnit(ctx.organizationId, ctx.userId, id, input);
    return ok(unit, 201);
  });
}
