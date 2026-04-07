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
    cloudProvider: tenant.cloudProvider,
    cloudTeamId: tenant.cloudTeamId,
    hasCloudToken: !!tenant.cloudApiToken,
    cloudConfig: tenant.cloudConfig,
    dbProvider: tenant.dbProvider,
    dbConfig: tenant.dbConfig,
    plan: tenant.plan,
    createdAt: tenant.createdAt,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  cloudProvider: z.enum(["vercel", "aws", "cloudflare", "netlify"]).optional(),
  cloudTeamId: z.string().optional(),
  cloudApiToken: z.string().optional(),
  cloudConfig: z.record(z.string(), z.unknown()).optional(),
  dbProvider: z.enum(["postgres", "mysql", "mongodb"]).optional().nullable(),
  dbConfig: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: Request) {
  const { tenant } = await requireAdmin();
  const body = updateSchema.parse(await request.json());

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.cloudProvider) updates.cloudProvider = body.cloudProvider;
  if (body.cloudTeamId) updates.cloudTeamId = body.cloudTeamId;
  if (body.cloudApiToken) {
    const { encrypted } = encrypt(body.cloudApiToken);
    updates.cloudApiToken = encrypted;
  }
  if (body.cloudConfig) updates.cloudConfig = body.cloudConfig;
  if (body.dbProvider !== undefined) updates.dbProvider = body.dbProvider;
  if (body.dbConfig) updates.dbConfig = body.dbConfig;

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
    cloudProvider: updated.cloudProvider,
    cloudTeamId: updated.cloudTeamId,
    hasCloudToken: !!updated.cloudApiToken,
    cloudConfig: updated.cloudConfig,
    dbProvider: updated.dbProvider,
    dbConfig: updated.dbConfig,
    plan: updated.plan,
  });
}
