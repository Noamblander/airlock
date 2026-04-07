import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { mcpContext } from "@/lib/mcp/context";

export async function POST(request: Request) {
  try {
    const authCtx = await authenticateMcpRequest(request);

    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    await server.connect(transport);

    return await mcpContext.run(authCtx, async () => {
      return await transport.handleRequest(request);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
