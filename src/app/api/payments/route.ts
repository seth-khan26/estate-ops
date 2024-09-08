import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import { recordPayment, recordPaymentSchema } from "@/modules/payments/service";

export async function POST(request: Request) {
  return withAuth("payments.manage", async (ctx) => {
    const input = await parseBody(request, recordPaymentSchema);
    const payment = await recordPayment(ctx.organizationId, ctx.userId, input);
    return ok(payment, 201);
  });
}
