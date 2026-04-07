import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { SignJWT } from "jose";

export async function POST() {
  const { user, tenant } = await requireAuth();

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  // Generate a long-lived MCP token (90 days)
  const token = await new SignJWT({
    userId: user.id,
    tenantId: tenant.id,
    email: user.email,
    role: user.role,
    type: "mcp",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(secret);

  return NextResponse.json({ token });
}
