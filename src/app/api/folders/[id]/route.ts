import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { folders, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAuth();
  const { id } = await params;

  let body;
  try {
    body = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.tenantId, tenant.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const parentPath = existing.path.substring(0, existing.path.lastIndexOf("/"));
  const newSlug = body.name.toLowerCase().replace(/\s+/g, "-");
  const newPath = parentPath ? `${parentPath}/${newSlug}` : `/${newSlug}`;

  const [updated] = await db
    .update(folders)
    .set({ name: body.name, path: newPath })
    .where(eq(folders.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAuth();
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.tenantId, tenant.id)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const childFolders = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.parentId, id), eq(folders.tenantId, tenant.id)))
    .limit(1);

  if (childFolders.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a folder that contains subfolders. Remove subfolders first." },
      { status: 400 }
    );
  }

  const projectsInFolder = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.folderId, id), eq(projects.tenantId, tenant.id)))
    .limit(1);

  if (projectsInFolder.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a folder that contains projects. Move projects out first." },
      { status: 400 }
    );
  }

  await db
    .delete(folders)
    .where(and(eq(folders.id, id), eq(folders.tenantId, tenant.id)));

  return NextResponse.json({ success: true });
}
