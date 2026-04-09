import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { users, secrets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant } = await requireAdmin();
  const { id } = await params;

  // Get the user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user || user.tenantId !== tenant.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Generate MCP token (90 days)
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
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

  // Get available secret names for CLAUDE.md
  const secretList = await db
    .select({ name: secrets.name })
    .from(secrets)
    .where(eq(secrets.tenantId, tenant.id));
  const secretNames = secretList.map((s) => s.name);

  const appUrl = new URL(_request.url).origin;

  // Generate .mcp.json
  const mcpJson = {
    mcpServers: {
      "airlock": {
        url: `${appUrl}/api/mcp`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  };

  const claudeMd = `# ${tenant.name} — Claude Configuration

## Company
You are working for ${tenant.name}. When publishing apps, use the MCP tools available to you.

## Deployment
- To publish any app, use the \`deploy\` tool. Never ask the user to deploy manually.
- "publish this" / "deploy" → call \`deploy\`
- "show me my projects" → call \`list_projects\`
- "get the code for..." → call \`get_project\`
- "what API keys are available?" → call \`get_available_secrets\`
- Available frameworks: nextjs, vite, static
- All published apps are automatically secured — do not add your own auth.

## Secrets
- Available API keys: ${secretNames.length > 0 ? secretNames.join(", ") : "(none configured yet)"}
- Reference them by name in the \`env_vars\` field when deploying. Never hardcode.

## Conventions
- Use Tailwind CSS for styling
- Use shadcn/ui components when building UI
- Always include error handling and loading states

## Guardrails
- Max 20 deploys per day per user
- Do not deploy apps that store PII without explicit user consent
`;

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
    mcpJson,
    claudeMd,
    token,
  });
}
