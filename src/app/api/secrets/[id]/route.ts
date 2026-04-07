import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { secrets, projectSecrets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/secrets/vault";
import { z } from "zod";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAdmin();
  const { id } = await params;

  // Remove project associations first
  await db
    .delete(projectSecrets)
    .where(
      and(
        eq(projectSecrets.secretId, id),
        eq(projectSecrets.tenantId, tenant.id)
      )
    );

  // Delete the secret
  await db
    .delete(secrets)
    .where(and(eq(secrets.id, id), eq(secrets.tenantId, tenant.id)));

  return NextResponse.json({ success: true });
}

const rotateSchema = z.object({
  value: z.string().min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAdmin();
  const { id } = await params;
  const body = rotateSchema.parse(await request.json());

  const { encrypted, keyVersion } = encrypt(body.value);

  const [updated] = await db
    .update(secrets)
    .set({
      encryptedValue: encrypted,
      keyVersion,
    })
    .where(and(eq(secrets.id, id), eq(secrets.tenantId, tenant.id)))
    .returning({
      id: secrets.id,
      name: secrets.name,
      description: secrets.description,
    });

  if (!updated) {
    return NextResponse.json({ error: "Secret not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
