import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

    // Verify the one-time token
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== "one-time") {
      return NextResponse.json({ error: "Invalid token type" }, { status: 400 });
    }

    // Generate a session token (24h TTL)
    const sessionToken = await new SignJWT({
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      type: "session",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    return NextResponse.json({
      sessionToken,
      expiresIn: 86400, // 24 hours in seconds
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
