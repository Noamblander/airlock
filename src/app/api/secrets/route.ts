import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { secrets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt } from "@/lib/secrets/vault";
import { z } from "zod";

export async function GET() {
  const { tenant } = await requireAuth();

  const results = await db
    .select({
      id: secrets.id,
      name: secrets.name,
      description: secrets.description,
      addedByName: users.name,
      createdAt: secrets.createdAt,
    })
    .from(secrets)
    .leftJoin(users, eq(secrets.addedBy, users.id))
    .where(eq(secrets.tenantId, tenant.id));

  return NextResponse.json(results);
}

const createSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Must be uppercase with underscores (e.g., OPENAI_API_KEY)"),
  value: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const { tenant, user } = await requireAdmin();
  const body = createSchema.parse(await request.json());

  const { encrypted, keyVersion } = encrypt(body.value);

  const [secret] = await db
    .insert(secrets)
    .values({
      tenantId: tenant.id,
      name: body.name,
      description: body.description || "",
      encryptedValue: encrypted,
      keyVersion,
      addedBy: user.id,
    })
    .returning({
      id: secrets.id,
      name: secrets.name,
      description: secrets.description,
      createdAt: secrets.createdAt,
    });

  return NextResponse.json(secret, { status: 201 });
}
