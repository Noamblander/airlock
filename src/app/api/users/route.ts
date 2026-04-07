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

  // Create user record
  const [user] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email: body.email,
      name: body.name,
      role: body.role,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });

  // Send invite email via Supabase (uses service role for admin API)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient.auth.admin.inviteUserByEmail(body.email, {
      redirectTo: `${appUrl}/api/auth/callback`,
      data: {
        full_name: body.name,
      },
    });
  } catch {
    // Invite email is best-effort — user record is already created
    // They can still sign in manually via the login page
  }

  return NextResponse.json(user, { status: 201 });
}
