import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users, tenants, projects, projectShares } from "@/lib/db/schema";
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

  // Check project-level access for private apps
  let redirectHost: string;
  try {
    redirectHost = new URL(redirectUrl).hostname;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=invalid_redirect`);
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.tenantId, tenantRecord.id))
    .then((rows) =>
      rows.filter((p) => {
        if (!p.deployUrl) return false;
        try {
          const host = new URL(
            p.deployUrl.startsWith("https://") ? p.deployUrl : `https://${p.deployUrl}`
          ).hostname;
          return host === redirectHost;
        } catch {
          return false;
        }
      })
    );

  if (project && project.visibility === "private") {
    const isCreator = project.createdBy === userRecord.id;
    const isAdmin = userRecord.role === "admin";
    if (!isCreator && !isAdmin) {
      const [share] = await db
        .select()
        .from(projectShares)
        .where(
          and(
            eq(projectShares.projectId, project.id),
            eq(projectShares.userId, userRecord.id)
          )
        )
        .limit(1);
      if (!share) {
        return NextResponse.redirect(`${origin}/dashboard?error=no_access`);
      }
    }
  }

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

  const targetUrl = new URL(redirectUrl);
  targetUrl.searchParams.set("_oat", oneTimeToken);

  return NextResponse.redirect(targetUrl.toString());
}
