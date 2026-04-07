import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SignJWT } from "jose";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tenant = searchParams.get("tenant") || "";
  const redirectUrl = searchParams.get("redirect") || "";

  if (!code || !redirectUrl) {
    return NextResponse.redirect(`${origin}/login?error=missing_params`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`);
  }

  // Verify user belongs to the tenant
  const [tenantRecord] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenant))
    .limit(1);

  if (!tenantRecord) {
    return NextResponse.redirect(`${origin}/login?error=invalid_tenant`);
  }

  const [userRecord] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantRecord.id),
        eq(users.email, authUser.email)
      )
    )
    .limit(1);

  if (!userRecord) {
    return NextResponse.redirect(`${origin}/login?error=not_authorized`);
  }

  // Generate one-time token (30s TTL)
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const oneTimeToken = await new SignJWT({
    userId: userRecord.id,
    tenantId: tenantRecord.id,
    email: userRecord.email,
    role: userRecord.role,
    type: "one-time",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30s")
    .sign(secret);

  // Redirect back to published app with one-time token
  const targetUrl = new URL(redirectUrl);
  targetUrl.searchParams.set("_oat", oneTimeToken);

  return NextResponse.redirect(targetUrl.toString());
}
