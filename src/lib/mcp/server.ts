import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSecretsTool } from "./tools/secrets";
import { registerListProjectsTool } from "./tools/list-projects";
import { registerGetProjectTool } from "./tools/get-project";
import { registerDeployTool } from "./tools/deploy";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "airlock",
    version: "1.0.0",
  });

  registerSecretsTool(server);
  registerListProjectsTool(server);
  registerGetProjectTool(server);
  registerDeployTool(server);

  return server;
}
