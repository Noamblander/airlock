import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { deployments, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAuth();
  const { id } = await params;

  const results = await db
    .select({
      id: deployments.id,
      status: deployments.status,
      url: deployments.url,
      providerDeployId: deployments.providerDeployId,
      triggeredByName: users.name,
      createdAt: deployments.createdAt,
    })
    .from(deployments)
    .leftJoin(users, eq(deployments.triggeredBy, users.id))
    .where(
      and(
        eq(deployments.projectId, id),
        eq(deployments.tenantId, tenant.id)
      )
    )
    .orderBy(desc(deployments.createdAt))
    .limit(50);

  return NextResponse.json(results);
}
