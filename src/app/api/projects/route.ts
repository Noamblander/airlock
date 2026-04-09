import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, users, deployments } from "@/lib/db/schema";
import { eq, and, ilike, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { tenant } = await requireAuth();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const conditions = [eq(projects.tenantId, tenant.id)];
  if (status) conditions.push(eq(projects.status, status));
  if (search) conditions.push(ilike(projects.name, `%${search}%`));

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      framework: projects.framework,
      deployUrl: projects.deployUrl,
      thumbnailUrl: projects.thumbnailUrl,
      status: projects.status,
      authorName: users.name,
      createdBy: projects.createdBy,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(users, eq(projects.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(projects.updatedAt));

  if (projectRows.length === 0) {
    return NextResponse.json([]);
  }

  const projectIds = projectRows.map((p) => p.id);
  const deployStats = await db
    .select({
      projectId: deployments.projectId,
      deploymentCount: sql<number>`count(*)::int`,
      lastDeployedAt: sql<string>`max(${deployments.createdAt})`,
    })
    .from(deployments)
    .where(sql`${deployments.projectId} = ANY(${projectIds})`)
    .groupBy(deployments.projectId);

  const statsMap = new Map(
    deployStats.map((s) => [s.projectId, s])
  );

  const results = projectRows.map((p) => {
    const stats = statsMap.get(p.id);
    return {
      ...p,
      deploymentCount: stats?.deploymentCount ?? 0,
      lastDeployedAt: stats?.lastDeployedAt ?? null,
    };
  });

  return NextResponse.json(results);
}
