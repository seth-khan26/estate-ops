import { withAuth, ok } from "@/lib/api-helpers";
import { getDashboardStats } from "@/modules/properties/service";

export async function GET() {
  return withAuth("properties.read", async (ctx) => {
    const stats = await getDashboardStats(ctx.organizationId);
    return ok(stats);
  });
}
