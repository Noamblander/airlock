import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, tenants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/secrets/vault";
import { getProvider } from "@/lib/deploy/providers/registry";
import type { CloudProvider } from "@/lib/deploy/providers/types";

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

  if (project.providerProjectId && tenant.cloudApiToken) {
    try {
      const cloudProvider = (tenant.cloudProvider || "vercel") as CloudProvider;
      const provider = getProvider(cloudProvider);
      const token = decrypt(tenant.cloudApiToken);
      await provider.deleteProject(project.providerProjectId, {
        token,
        teamId: tenant.cloudTeamId,
      });
    } catch (err) {
      console.error("Provider project deletion failed:", err);
      return NextResponse.json(
        { error: `Failed to stop project on ${tenant.cloudProvider || "vercel"}: ${err instanceof Error ? err.message : "Unknown error"}` },
        { status: 502 }
      );
    }
  }

  const [updated] = await db
    .update(projects)
    .set({ status: "stopped", updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return NextResponse.json(updated);
}
