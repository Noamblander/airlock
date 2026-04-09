import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { folders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const { tenant } = await requireAuth();

  const results = await db
    .select({
      id: folders.id,
      name: folders.name,
      parentId: folders.parentId,
      path: folders.path,
      createdAt: folders.createdAt,
    })
    .from(folders)
    .where(eq(folders.tenantId, tenant.id))
    .orderBy(folders.path);

  return NextResponse.json(results);
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const { tenant, user } = await requireAuth();

  let body;
  try {
    body = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input. Name is required." }, { status: 400 });
  }

  let parentPath = "";
  if (body.parentId) {
    const [parent] = await db
      .select({ path: folders.path })
      .from(folders)
      .where(eq(folders.id, body.parentId))
      .limit(1);

    if (!parent) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
    parentPath = parent.path;
  }

  const folderPath = parentPath
    ? `${parentPath}/${body.name.toLowerCase().replace(/\s+/g, "-")}`
    : `/${body.name.toLowerCase().replace(/\s+/g, "-")}`;

  const [folder] = await db
    .insert(folders)
    .values({
      tenantId: tenant.id,
      name: body.name,
      parentId: body.parentId ?? null,
      path: folderPath,
      createdBy: user.id,
    })
    .returning();

  return NextResponse.json(folder, { status: 201 });
}
