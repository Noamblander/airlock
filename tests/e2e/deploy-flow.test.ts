import { test, expect } from "@playwright/test";

test.describe("Deploy Flow via MCP", () => {
  test("MCP endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.post("/api/mcp", {
      data: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "deploy",
          arguments: {
            project_name: "test",
            framework: "static",
            files: { "index.html": "<h1>test</h1>" },
          },
        },
        id: 1,
      },
    });

    expect(response.status()).toBe(401);
  });

  test("projects API returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/projects");
    expect(response.status()).toBe(401);
  });

  test("tenant API returns 401 without auth", async ({ request }) => {
    const response = await request.get("/api/tenant");
    expect(response.status()).toBe(401);
  });
});
