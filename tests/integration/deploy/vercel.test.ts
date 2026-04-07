import { describe, it, expect } from "vitest";
import { VercelProvider } from "@/lib/deploy/providers/vercel";
import type { ProviderConfig, ProviderFile } from "@/lib/deploy/providers/types";

const config: ProviderConfig = {
  token: "test-vercel-token",
  teamId: "team_test123",
};

const testFiles: ProviderFile[] = [
  { path: "index.html", content: "<h1>Hello</h1>" },
  { path: "style.css", content: "body { color: red; }" },
];

describe("VercelProvider", () => {
  const provider = new VercelProvider();

  it("has correct name", () => {
    expect(provider.name).toBe("vercel");
  });

  it("creates a project", async () => {
    const project = await provider.createProject("my-test-app", "static", config);
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
  });

  it("deploys files", async () => {
    const deployment = await provider.deploy("prj_my-test-app", testFiles, "static", config);
    expect(deployment).toHaveProperty("id");
    expect(deployment).toHaveProperty("url");
    expect(deployment.url).toContain("vercel.app");
  });

  it("sets environment variables", async () => {
    await expect(
      provider.setEnvVars("prj_test", [
        { key: "API_KEY", value: "sk-test", target: ["production", "preview"] },
      ], config)
    ).resolves.toBeUndefined();
  });

  it("deletes a deployment", async () => {
    await expect(
      provider.deleteDeployment("dpl_test123", config)
    ).resolves.toBeUndefined();
  });

  it("generates correct deploy URL", () => {
    const url = provider.getDeployUrl({ id: "dpl_1", url: "my-app.vercel.app" });
    expect(url).toBe("https://my-app.vercel.app");
  });
});
