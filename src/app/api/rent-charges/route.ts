import { withAuth, ok } from "@/lib/api-helpers";
import { listRentCharges } from "@/modules/payments/service";

export async function GET(request: Request) {
  return withAuth("payments.read", async (ctx) => {
    const url = new URL(request.url);
    const leaseId = url.searchParams.get("leaseId") ?? undefined;
    const charges = await listRentCharges(ctx.organizationId, leaseId);
    return ok(charges);
  });
}
