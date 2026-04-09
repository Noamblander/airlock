import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const { tenant } = await requireAuth();

  const results = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.tenantId, tenant.id));

  return NextResponse.json(results);
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(request: Request) {
  const { tenant } = await requireAdmin();

  let body;
  try {
    body = inviteSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input. Provide a valid email, name, and role." }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(
      and(eq(users.tenantId, tenant.id), eq(users.email, body.email))
    )
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "This user has already been invited" },
      { status: 400 }
    );
  }

  const adminClient = createSupabaseAdminClient();
  const appUrl = new URL(request.url).origin;

  let authUserId: string | undefined;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(body.email, {
      data: { full_name: body.name },
      redirectTo: `${appUrl}/login`,
    });

  if (inviteError) {
    if (inviteError.message.includes("already been registered")) {
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existingAuth = listData?.users?.find(
        (u) => u.email === body.email
      );
      authUserId = existingAuth?.id;
    } else {
      return NextResponse.json(
        { error: `Failed to send invite: ${inviteError.message}` },
        { status: 500 }
      );
    }
  } else {
    authUserId = inviteData.user?.id;
  }

  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email: body.email,
      name: body.name,
      role: body.role,
      authProviderId: authUserId,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });

  return NextResponse.json(
    { ...user, invited: true, loginUrl: `${appUrl}/login` },
    { status: 201 }
  );
}
