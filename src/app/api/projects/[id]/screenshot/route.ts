import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { SignJWT } from "jose";
import { requireAuth } from "@/lib/auth/guards";

const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 800;

async function captureScreenshotUrl(url: string): Promise<string | null> {
  const screenshotApiUrl =
    `https://api.microlink.io/?url=${encodeURIComponent(url)}` +
    `&screenshot=true&meta=false` +
    `&viewport.width=${SCREENSHOT_WIDTH}&viewport.height=${SCREENSHOT_HEIGHT}` +
    `&waitForTimeout=3000`;

  const res = await fetch(screenshotApiUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;

  const data = await res.json();
  return data?.data?.screenshot?.url ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accept either internal service secret or an authenticated user session.
  const authHeader = request.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;
  let tenantFilter: string | null = null;

  if (authHeader === `Bearer ${internalSecret}`) {
    // Internal call — no tenant restriction
  } else {
    // User session call — restrict to their tenant
    try {
      const { tenant } = await requireAuth();
      tenantFilter = tenant.id;
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(
      tenantFilter
        ? and(eq(projects.id, id), eq(projects.tenantId, tenantFilter))
        : eq(projects.id, id)
    )
    .limit(1);

  if (!project || !project.deployUrl) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let targetUrl = project.deployUrl.startsWith("https://")
    ? project.deployUrl
    : `https://${project.deployUrl}`;

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const oat = await new SignJWT({
    userId: "system",
    tenantId: project.tenantId,
    email: "system@internal",
    role: "admin",
    type: "one-time",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("60s")
    .sign(secret);

  const urlWithAuth = new URL(targetUrl);
  urlWithAuth.searchParams.set("_oat", oat);

  try {
    const screenshotUrl = await captureScreenshotUrl(urlWithAuth.toString());
    if (!screenshotUrl) {
      return NextResponse.json(
        { error: "Screenshot capture failed" },
        { status: 502 }
      );
    }

    // Try to persist to Vercel Blob for better performance. Fall back to
    // storing the Microlink CDN URL directly if Blob isn't configured.
    let thumbnailUrl = screenshotUrl;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const imgRes = await fetch(screenshotUrl);
        if (imgRes.ok) {
          const imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          const blob = await put(
            `screenshots/${project.tenantId}/${id}.png`,
            imageBuffer,
            { access: "public", contentType: "image/png" }
          );
          thumbnailUrl = blob.url;
        }
      } catch {
        // Blob upload failed — keep the Microlink URL
      }
    }

    await db
      .update(projects)
      .set({ thumbnailUrl })
      .where(eq(projects.id, id));

    return NextResponse.json({ thumbnailUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screenshot failed" },
      { status: 500 }
    );
  }
}
