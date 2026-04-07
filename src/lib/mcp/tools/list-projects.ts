import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { projects, users } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { getMcpContext } from "../context";

export function registerListProjectsTool(server: McpServer) {
  server.tool(
    "list_projects",
    "Browse existing company projects, with optional filters by status or search query. Use when user asks 'show me my projects' or 'list projects'.",
    {
      status: z
        .enum(["live", "stopped"])
        .optional()
        .describe("Filter by project status"),
      search: z
        .string()
        .optional()
        .describe("Search by project name"),
    },
    async ({ status, search }) => {
      const ctx = getMcpContext();

      const conditions = [eq(projects.tenantId, ctx.tenantId)];

      if (status) {
        conditions.push(eq(projects.status, status));
      }
      if (search) {
        conditions.push(ilike(projects.name, `%${search}%`));
      }

      const results = await db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          description: projects.description,
          framework: projects.framework,
          url: projects.vercelUrl,
          status: projects.status,
          authorName: users.name,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .leftJoin(users, eq(projects.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(projects.updatedAt);

      const projectList = results.map((p) => ({
        name: p.name,
        slug: p.slug,
        description: p.description,
        framework: p.framework,
        url: p.url,
        status: p.status,
        author: p.authorName || "unknown",
        last_updated: p.updatedAt?.toISOString(),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(projectList, null, 2),
          },
        ],
      };
    }
  );
}
