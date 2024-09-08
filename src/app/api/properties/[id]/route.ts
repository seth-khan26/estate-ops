import { withAuth, ok, parseBody } from "@/lib/api-helpers";
import {
  getProperty,
  updateProperty,
  updatePropertySchema,
} from "@/modules/properties/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("properties.read", async (ctx) => {
    const { id } = await params;
    const property = await getProperty(ctx.organizationId, id);
    return ok(property);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth("properties.manage", async (ctx) => {
    const { id } = await params;
    const input = await parseBody(request, updatePropertySchema);
    const property = await updateProperty(ctx.organizationId, ctx.userId, id, input);
    return ok(property);
  });
}
