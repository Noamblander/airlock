import { AsyncLocalStorage } from "async_hooks";

export type McpAuthContext = {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
};

export const mcpContext = new AsyncLocalStorage<McpAuthContext>();

export function getMcpContext(): McpAuthContext {
  const ctx = mcpContext.getStore();
  if (!ctx) {
    throw new Error("MCP auth context not available");
  }
  return ctx;
}
