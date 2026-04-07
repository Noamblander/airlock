import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { projects, deployments, projectSecrets, secrets } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getMcpContext } from "../context";

export function registerGetProjectTool(server: McpServer) {
  server.tool(
    "get_project",
    "Get full details and source code of an existing project for modification. Use when user asks 'get the code for...' or 'show me project X'.",
    {
      name: z
        .string()
        .describe("Project name or slug"),
    },
    async ({ name }) => {
      const ctx = getMcpContext();

      // Find project by name or slug
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.tenantId, ctx.tenantId),
            eq(projects.slug, name.toLowerCase().replace(/\s+/g, "-"))
          )
        )
        .limit(1);

      if (!project) {
        // Try by name
        const [byName] = await db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.tenantId, ctx.tenantId),
              eq(projects.name, name)
            )
          )
          .limit(1);

        if (!byName) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: true,
                  code: "PROJECT_NOT_FOUND",
                  message: `Project "${name}" not found`,
                }),
              },
            ],
          };
        }

        return await getProjectDetails(byName, ctx.tenantId);
      }

      return await getProjectDetails(project, ctx.tenantId);
    }
  );
}

async function getProjectDetails(
  project: typeof projects.$inferSelect,
  tenantId: string
) {
  // Get latest deployment with files snapshot
  const [latestDeploy] = await db
    .select()
    .from(deployments)
    .where(
      and(
        eq(deployments.projectId, project.id),
        eq(deployments.tenantId, tenantId)
      )
    )
    .orderBy(desc(deployments.createdAt))
    .limit(1);

  // Get deployment history (last 10)
  const deployHistory = await db
    .select({
      id: deployments.id,
      status: deployments.status,
      url: deployments.url,
      createdAt: deployments.createdAt,
    })
    .from(deployments)
    .where(
      and(
        eq(deployments.projectId, project.id),
        eq(deployments.tenantId, tenantId)
      )
    )
    .orderBy(desc(deployments.createdAt))
    .limit(10);

  // Get associated secret names
  const secretAssociations = await db
    .select({ name: secrets.name })
    .from(projectSecrets)
    .innerJoin(secrets, eq(projectSecrets.secretId, secrets.id))
    .where(
      and(
        eq(projectSecrets.projectId, project.id),
        eq(projectSecrets.tenantId, tenantId)
      )
    );

  const result = {
    name: project.name,
    slug: project.slug,
    description: project.description,
    framework: project.framework,
    url: project.deployUrl,
    status: project.status,
    files: latestDeploy?.filesSnapshot || {},
    env_vars: secretAssociations.map((s) => s.name),
    deploy_history: deployHistory.map((d) => ({
      id: d.id,
      status: d.status,
      url: d.url,
      created_at: d.createdAt?.toISOString(),
    })),
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
