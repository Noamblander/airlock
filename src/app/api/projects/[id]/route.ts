import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, deployments, projectSecrets, secrets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAuth();
  const { id } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.tenantId, tenant.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get latest deployment
  const [latestDeploy] = await db
    .select()
    .from(deployments)
    .where(
      and(
        eq(deployments.projectId, project.id),
        eq(deployments.tenantId, tenant.id)
      )
    )
    .orderBy(desc(deployments.createdAt))
    .limit(1);

  // Get associated secrets
  const secretList = await db
    .select({ name: secrets.name })
    .from(projectSecrets)
    .innerJoin(secrets, eq(projectSecrets.secretId, secrets.id))
    .where(eq(projectSecrets.projectId, project.id));

  return NextResponse.json({
    ...project,
    latestDeployment: latestDeploy || null,
    secrets: secretList.map((s) => s.name),
  });
}

const updateSchema = z.object({
  description: z.string().optional(),
  name: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAuth();
  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.tenantId, tenant.id)))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json(updated);
}
