import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, projectShares, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select({
      visibility: projects.visibility,
      createdBy: projects.createdBy,
    })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.tenantId, tenant.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const shares = await db
    .select({
      id: projectShares.id,
      userId: projectShares.userId,
      userName: users.name,
      userEmail: users.email,
      grantedAt: projectShares.grantedAt,
    })
    .from(projectShares)
    .innerJoin(users, eq(projectShares.userId, users.id))
    .where(eq(projectShares.projectId, id));

  return NextResponse.json({
    visibility: project.visibility,
    shares,
  });
}

const patchSchema = z.object({
  visibility: z.enum(["private", "organization", "link"]).optional(),
  addUserId: z.string().uuid().optional(),
  removeShareId: z.string().uuid().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, user } = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.tenantId, tenant.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.createdBy !== user.id && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only the project creator or an admin can change sharing settings" },
      { status: 403 }
    );
  }

  let body;
  try {
    body = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (body.visibility) {
    await db
      .update(projects)
      .set({ visibility: body.visibility, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  if (body.addUserId) {
    const [targetUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, body.addUserId), eq(users.tenantId, tenant.id)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
    }

    await db
      .insert(projectShares)
      .values({
        projectId: id,
        userId: body.addUserId,
        grantedBy: user.id,
      })
      .onConflictDoNothing();
  }

  if (body.removeShareId) {
    await db
      .delete(projectShares)
      .where(
        and(
          eq(projectShares.id, body.removeShareId),
          eq(projectShares.projectId, id)
        )
      );
  }

  return NextResponse.json({ success: true });
}
