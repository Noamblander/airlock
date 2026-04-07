import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { tenants, users, secrets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/secrets/vault";
import { z } from "zod";

const onboardingSchema = z.object({
  companyName: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  domain: z.string().min(1),
  cloudProvider: z.enum(["vercel", "aws", "cloudflare", "netlify"]).default("vercel"),
  cloudTeamId: z.string().optional(),
  cloudApiToken: z.string().optional(),
  cloudConfig: z.record(z.string(), z.unknown()).optional(),
  dbProvider: z.enum(["postgres", "mysql", "mongodb"]).optional(),
  dbConfig: z.record(z.string(), z.unknown()).optional(),
  secrets: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) {
    return NextResponse.json({ error: "Not authenticated. Please sign in first." }, { status: 401 });
  }

  let body;
  try {
    body = onboardingSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid input. Check all fields and try again." },
      { status: 400 }
    );
  }

  try {
    // Check if tenant already exists (from a previous attempt)
    let [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, body.slug))
      .limit(1);

    if (!tenant) {
      // Create new tenant
      const encryptedToken = body.cloudApiToken
        ? encrypt(body.cloudApiToken).encrypted
        : null;

      [tenant] = await db
        .insert(tenants)
        .values({
          name: body.companyName,
          slug: body.slug,
          domain: body.domain,
          cloudProvider: body.cloudProvider,
          cloudTeamId: body.cloudTeamId ?? null,
          cloudApiToken: encryptedToken,
          cloudConfig: body.cloudConfig ?? {},
          dbProvider: body.dbProvider ?? null,
          dbConfig: body.dbConfig ?? {},
        })
        .returning();
    }

    // Check if user already exists for this tenant
    let [user] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.tenantId, tenant.id), eq(users.email, authUser.email))
      )
      .limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: authUser.email,
          name:
            authUser.user_metadata?.full_name ||
            authUser.email.split("@")[0],
          role: "admin",
          authProviderId: authUser.id,
        })
        .returning();
    }

    // Create secrets (skip empty ones)
    const validSecrets = (body.secrets || []).filter(
      (s) => s.name && s.value
    );
    if (validSecrets.length > 0) {
      const secretValues = validSecrets.map((s) => {
        const { encrypted, keyVersion } = encrypt(s.value);
        return {
          tenantId: tenant.id,
          name: s.name,
          description: s.description || "",
          encryptedValue: encrypted,
          keyVersion,
          addedBy: user.id,
        };
      });

      await db.insert(secrets).values(secretValues);
    }

    return NextResponse.json({
      tenantId: tenant.id,
      slug: tenant.slug,
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    const message =
      err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
