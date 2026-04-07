import { describe, it, expect } from "vitest";
import { NetlifyProvider } from "@/lib/deploy/providers/netlify";
import type { ProviderConfig, ProviderFile } from "@/lib/deploy/providers/types";

const config: ProviderConfig = {
  token: "test-netlify-token",
  teamId: "my-team",
};

const testFiles: ProviderFile[] = [
  { path: "index.html", content: "<h1>Hello Netlify</h1>" },
];

describe("NetlifyProvider", () => {
  const provider = new NetlifyProvider();

  it("has correct name", () => {
    expect(provider.name).toBe("netlify");
  });

  it("creates a site", async () => {
    const project = await provider.createProject("netlify-test", "static", config);
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
    expect(project.name).toBe("netlify-test");
  });

  it("deploys files", async () => {
    const deployment = await provider.deploy("netlify_test", testFiles, "static", config);
    expect(deployment).toHaveProperty("id");
    expect(deployment).toHaveProperty("url");
    expect(deployment.url).toContain("netlify.app");
  });

  it("sets environment variables", async () => {
    await expect(
      provider.setEnvVars("netlify_test", [
        { key: "TOKEN", value: "abc", target: ["production"] },
      ], config)
    ).resolves.toBeUndefined();
  });

  it("deletes a site", async () => {
    await expect(
      provider.deleteDeployment("netlify_test", config)
    ).resolves.toBeUndefined();
  });

  it("generates correct deploy URL", () => {
    const url = provider.getDeployUrl({ id: "d1", url: "https://test.netlify.app" });
    expect(url).toBe("https://test.netlify.app");
  });
});
