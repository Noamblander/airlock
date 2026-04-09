import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const { user, tenant } = await requireAuth();
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    language: user.language,
    tenantName: tenant.name,
  });
}

const updateSchema = z.object({
  language: z.enum(["he", "en"]).optional(),
  name: z.string().min(1).optional(),
});

export async function PATCH(request: Request) {
  const { user } = await requireAuth();

  let body;
  try {
    body = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(body)
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({
    id: updated.id,
    language: updated.language,
    name: updated.name,
  });
}
