import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import {
  getMaintenanceRequest,
  updateMaintenanceRequest,
  updateMaintenanceSchema,
} from "@/modules/maintenance/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("maintenance.read", async (ctx) => {
    const { id } = await params;
    const req = await getMaintenanceRequest(ctx.organizationId, id);
    return ok(req);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("maintenance.manage", async (ctx) => {
    const { id } = await params;
    const input = await parseBody(request, updateMaintenanceSchema);
    const req = await updateMaintenanceRequest(ctx.organizationId, ctx.userId, id, input);
    return ok(req);
  });
}
