import { NextResponse } from "next/server";
import { requireTenantContext, TenantContext } from "@/modules/tenancy/context";
import { hasPermission } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import { z } from "zod";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  permission: Parameters<typeof hasPermission>[1],
  handler: (ctx: TenantContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const ctx = await requireTenantContext();
    if (!hasPermission(ctx.role, permission)) {
      return err("Forbidden", 403);
    }
    return await handler(ctx);
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "Unauthorized") return err("Unauthorized", 401);
      if (e.message.includes("not found")) return err(e.message, 404);
      if (e.message.includes("already")) return err(e.message, 409);
      return err(e.message, 400);
    }
    return err("Internal error", 500);
  }
}

export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}
