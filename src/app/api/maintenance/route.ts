import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import {
  listMaintenanceRequests,
  createMaintenanceRequest,
  createMaintenanceSchema,
} from "@/modules/maintenance/service";
import { MaintenanceStatus } from "@prisma/client";

export async function GET(request: Request) {
  return withAuth("maintenance.read", async (ctx) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as MaintenanceStatus | null;
    const propertyId = url.searchParams.get("propertyId") ?? undefined;
    const requests = await listMaintenanceRequests(ctx.organizationId, {
      ...(status && { status }),
      ...(propertyId && { propertyId }),
    });
    return ok(requests);
  });
}

export async function POST(request: Request) {
  return withAuth("maintenance.manage", async (ctx) => {
    const input = await parseBody(request, createMaintenanceSchema);
    const req = await createMaintenanceRequest(ctx.organizationId, ctx.userId, input);
    return ok(req, 201);
  });
}
