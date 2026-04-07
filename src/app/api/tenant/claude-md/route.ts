import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { secrets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateClaudeMd } from "@/lib/templates/claude-md";

export async function GET() {
  const { tenant } = await requireAuth();

  const secretList = await db
    .select({ name: secrets.name })
    .from(secrets)
    .where(eq(secrets.tenantId, tenant.id));

  const secretNames = secretList.map((s) => s.name);
  const content = generateClaudeMd(tenant, secretNames);

  return NextResponse.json({ content });
}
