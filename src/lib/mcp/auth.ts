import { jwtVerify } from "jose";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { McpAuthContext } from "./context";

export async function authenticateMcpRequest(
  request: Request
): Promise<McpAuthContext> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  try {
    const { payload } = await jwtVerify(token, secret);

    // Look up user to verify they still exist
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "User not found") {
      throw err;
    }
    throw new Error("Invalid or expired token");
  }
}
