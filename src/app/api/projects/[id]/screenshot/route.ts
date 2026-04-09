import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { put } from "@vercel/blob";
import { SignJWT } from "jose";

const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 800;

async function captureScreenshot(url: string): Promise<Buffer | null> {
  const screenshotApiUrl =
    `https://api.microlink.io/?url=${encodeURIComponent(url)}` +
    `&screenshot=true&meta=false&embed=screenshot.url` +
    `&viewport.width=${SCREENSHOT_WIDTH}&viewport.height=${SCREENSHOT_HEIGHT}` +
    `&waitForTimeout=3000`;

  const res = await fetch(screenshotApiUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    return Buffer.from(await res.arrayBuffer());
  }

  const data = await res.json();
  if (data?.data?.screenshot?.url) {
    const imgRes = await fetch(data.data.screenshot.url);
    if (imgRes.ok) return Buffer.from(await imgRes.arrayBuffer());
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = request.headers.get("authorization");
  const internalSecret = process.env.INTERNAL_API_SECRET || process.env.JWT_SECRET;
  if (!authHeader || authHeader !== `Bearer ${internalSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
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
    const imageBuffer = await captureScreenshot(urlWithAuth.toString());
    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Screenshot capture failed" },
        { status: 502 }
      );
    }

    const blob = await put(
      `screenshots/${project.tenantId}/${id}.png`,
      imageBuffer,
      { access: "public", contentType: "image/png" }
    );

    await db
      .update(projects)
      .set({ thumbnailUrl: blob.url })
      .where(eq(projects.id, id));

    return NextResponse.json({ thumbnailUrl: blob.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screenshot failed" },
      { status: 500 }
    );
  }
}
