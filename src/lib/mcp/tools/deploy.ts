import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMcpContext } from "../context";
import { orchestrateDeploy } from "@/lib/deploy/orchestrator";

export function registerDeployTool(server: McpServer) {
  server.tool(
    "deploy",
    "Publishes code to a new or existing Vercel project. Use when user says 'publish this', 'deploy', or 'ship it'.",
    {
      project_name: z
        .string()
        .describe("Name for the project (will be URL-slugified)"),
      files: z
        .record(z.string(), z.string())
        .optional()
        .describe("Full file set: { 'path/file.ts': 'content', ... }"),
      update_files: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          "Partial update: only changed files. Merged with existing snapshot."
        ),
      framework: z
        .enum(["nextjs", "vite", "static"])
        .describe("Project framework"),
      env_vars: z
        .array(z.string())
        .optional()
        .describe("Secret names to inject as environment variables"),
      description: z
        .string()
        .optional()
        .describe("Project description"),
      folder: z
        .string()
        .optional()
        .describe("Folder path for organization (Phase 3)"),
    },
    async (args) => {
      const ctx = getMcpContext();

      const result = await orchestrateDeploy(
        {
          project_name: args.project_name,
          files: args.files,
          update_files: args.update_files,
          framework: args.framework,
          env_vars: args.env_vars,
          description: args.description,
          folder: args.folder,
        },
        {
          userId: ctx.userId,
          tenantId: ctx.tenantId,
        }
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
