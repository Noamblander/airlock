import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/secrets/vault";
import { z } from "zod";

export async function GET() {
  const { tenant } = await requireAuth();

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    domain: tenant.domain,
    authProvider: tenant.authProvider,
    vercelTeamId: tenant.vercelTeamId,
    hasVercelToken: !!tenant.vercelApiToken,
    plan: tenant.plan,
    createdAt: tenant.createdAt,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  vercelTeamId: z.string().optional(),
  vercelApiToken: z.string().optional(),
});

export async function PATCH(request: Request) {
  const { tenant } = await requireAdmin();
  const body = updateSchema.parse(await request.json());

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.vercelTeamId) updates.vercelTeamId = body.vercelTeamId;
  if (body.vercelApiToken) {
    const { encrypted } = encrypt(body.vercelApiToken);
    updates.vercelApiToken = encrypted;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(tenant);
  }

  const [updated] = await db
    .update(tenants)
    .set(updates)
    .where(eq(tenants.id, tenant.id))
    .returning();

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    domain: updated.domain,
    vercelTeamId: updated.vercelTeamId,
    hasVercelToken: !!updated.vercelApiToken,
    plan: updated.plan,
  });
}
