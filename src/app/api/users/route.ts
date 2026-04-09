import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";

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
  const body = inviteSchema.parse(await request.json());

  // Check if user already exists
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

  // Generate a temp password for the invited user
  const tempPassword = randomBytes(6).toString("base64url");

  // Create or update Supabase auth account via admin API
  const adminClient = createSupabaseAdminClient();

  let authUserId: string | undefined;

  // Try creating the auth user
  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: body.name },
    });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      // User exists in Supabase — update their password instead
      const { data: listData } = await adminClient.auth.admin.listUsers();
      const existingAuth = listData?.users?.find(
        (u) => u.email === body.email
      );
      if (existingAuth) {
        await adminClient.auth.admin.updateUserById(existingAuth.id, {
          password: tempPassword,
        });
        authUserId = existingAuth.id;
      }
    } else {
      return NextResponse.json(
        { error: `Failed to create auth account: ${createError.message}` },
        { status: 500 }
      );
    }
  } else {
    authUserId = createData.user?.id;
  }

  // Create user record in DB
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

  const appUrl = new URL(request.url).origin;

  return NextResponse.json(
    { ...user, tempPassword, loginUrl: `${appUrl}/login` },
    { status: 201 }
  );
}
