import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteDeployment } from "@/lib/deploy/vercel";
import { decrypt } from "@/lib/secrets/vault";

export async function POST(
  _request: Request,
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

  if (project.status === "stopped") {
    return NextResponse.json({ error: "Project is already stopped" }, { status: 400 });
  }

  // Delete Vercel deployment
  if (project.vercelProjectId && tenant.vercelApiToken && tenant.vercelTeamId) {
    try {
      const token = decrypt(tenant.vercelApiToken);
      await deleteDeployment(project.vercelProjectId, tenant.vercelTeamId, token);
    } catch {
      // Continue even if Vercel deletion fails
    }
  }

  const [updated] = await db
    .update(projects)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json(updated);
}
