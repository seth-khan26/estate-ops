import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { assignMaintenanceRequest } from "@/modules/maintenance/service";
import { z } from "zod";

const schema = z.object({ assignedTo: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("maintenance.manage", async (ctx) => {
    const { id } = await params;
    const { assignedTo } = await parseBody(request, schema);
    const req = await assignMaintenanceRequest(ctx.organizationId, ctx.userId, id, assignedTo);
    return ok(req);
  });
}
