import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { projects, users } from "@/lib/db/schema";
import { eq, and, ilike, desc } from "drizzle-orm";

export async function GET(request: Request) {
  const { tenant } = await requireAuth();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const conditions = [eq(projects.tenantId, tenant.id)];
  if (status) conditions.push(eq(projects.status, status));
  if (search) conditions.push(ilike(projects.name, `%${search}%`));

  const results = await db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      framework: projects.framework,
      vercelUrl: projects.vercelUrl,
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

  return NextResponse.json(results);
}
