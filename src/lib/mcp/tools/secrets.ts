import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "@/lib/db/client";
import { secrets, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMcpContext } from "../context";

export function registerSecretsTool(server: McpServer) {
  server.tool(
    "get_available_secrets",
    "Lists API keys available for the tenant. Returns names and descriptions only, never values. Use when user asks 'what secrets are available?' or 'what API keys do I have?'",
    {},
    async () => {
      const ctx = getMcpContext();

      const results = await db
        .select({
          name: secrets.name,
          description: secrets.description,
          addedByName: users.name,
          createdAt: secrets.createdAt,
        })
        .from(secrets)
        .leftJoin(users, eq(secrets.addedBy, users.id))
        .where(eq(secrets.tenantId, ctx.tenantId));

      const secretList = results.map((s) => ({
        name: s.name,
        description: s.description,
        added_by: s.addedByName || "unknown",
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(secretList, null, 2),
          },
        ],
      };
    }
  );
}
