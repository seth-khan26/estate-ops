import { withAuth, ok, err, parseBody } from "@/lib/api-helpers";
import {
  listProperties,
  createProperty,
  createPropertySchema,
} from "@/modules/properties/service";

export async function GET() {
  return withAuth("properties.read", async (ctx) => {
    const properties = await listProperties(ctx.organizationId);
    return ok(properties);
  });
}

export async function POST(request: Request) {
  return withAuth("properties.manage", async (ctx) => {
    const input = await parseBody(request, createPropertySchema);
    const property = await createProperty(ctx.organizationId, ctx.userId, input);
    return ok(property, 201);
  });
}
