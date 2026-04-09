import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { users, tenants, projects, projectShares } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SignJWT } from "jose";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing projectId parameter" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("redirect", request.url);
    return NextResponse.redirect(loginUrl.toString());
  }

  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!userRecord) {
    return NextResponse.redirect(`${origin}/login?error=not_authorized`);
  }

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, userRecord.tenantId))
    .limit(1);

  if (!tenant) {
    return NextResponse.redirect(`${origin}/login?error=invalid_tenant`);
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.tenantId, tenant.id))
    )
    .limit(1);

  if (!project || !project.deployUrl) {
    return NextResponse.redirect(`${origin}/dashboard?error=project_not_found`);
  }

  if (project.status === "stopped") {
    return NextResponse.redirect(`${origin}/dashboard/projects/${projectId}?error=project_stopped`);
  }

  if (project.visibility === "private") {
    const isCreator = project.createdBy === userRecord.id;
    const isAdmin = userRecord.role === "admin";
    if (!isCreator && !isAdmin) {
      const [share] = await db
        .select()
        .from(projectShares)
        .where(
          and(
            eq(projectShares.projectId, projectId),
            eq(projectShares.userId, userRecord.id)
          )
        )
        .limit(1);
      if (!share) {
        return NextResponse.redirect(
          `${origin}/dashboard/projects/${projectId}?error=no_access`
        );
      }
    }
  }

  const deployUrl = project.deployUrl.startsWith("https://")
    ? project.deployUrl
    : `https://${project.deployUrl}`;

  if (project.visibility === "link") {
    return NextResponse.redirect(deployUrl);
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const oneTimeToken = await new SignJWT({
    userId: userRecord.id,
    tenantId: tenant.id,
    email: userRecord.email,
    role: userRecord.role,
    type: "one-time",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30s")
    .sign(secret);

  const targetUrl = new URL(deployUrl);
  targetUrl.searchParams.set("_oat", oneTimeToken);

  return NextResponse.redirect(targetUrl.toString());
}
