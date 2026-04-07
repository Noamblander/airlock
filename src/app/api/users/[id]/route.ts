import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAdmin();
  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  const [updated] = await db
    .update(users)
    .set({ role: body.role })
    .where(and(eq(users.id, id), eq(users.tenantId, tenant.id)))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAdmin();
  const { id } = await params;

  await db
    .delete(users)
    .where(and(eq(users.id, id), eq(users.tenantId, tenant.id)));

  return NextResponse.json({ success: true });
}
