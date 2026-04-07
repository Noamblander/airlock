import { describe, it, expect } from "vitest";
import { CloudflareProvider } from "@/lib/deploy/providers/cloudflare";
import type { ProviderConfig, ProviderFile } from "@/lib/deploy/providers/types";

const config: ProviderConfig = {
  token: "test-cf-token",
  teamId: "cf-account-123",
};

const testFiles: ProviderFile[] = [
  { path: "index.html", content: "<h1>Hello Cloudflare</h1>" },
];

describe("CloudflareProvider", () => {
  const provider = new CloudflareProvider();

  it("has correct name", () => {
    expect(provider.name).toBe("cloudflare");
  });

  it("creates a Pages project", async () => {
    const project = await provider.createProject("cf-test-app", "vite", config);
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
  });

  it("deploys files to Pages", async () => {
    const deployment = await provider.deploy("cf-test-app", testFiles, "vite", config);
    expect(deployment).toHaveProperty("id");
    expect(deployment).toHaveProperty("url");
    expect(deployment.url).toContain("pages.dev");
  });

  it("sets environment variables", async () => {
    await expect(
      provider.setEnvVars("cf-test-app", [
        { key: "SECRET", value: "value", target: ["production"] },
      ], config)
    ).resolves.toBeUndefined();
  });

  it("deletes a project", async () => {
    await expect(
      provider.deleteDeployment("cf-test-app", config)
    ).resolves.toBeUndefined();
  });

  it("generates correct deploy URL", () => {
    const url = provider.getDeployUrl({ id: "d1", url: "https://my-site.pages.dev" });
    expect(url).toBe("https://my-site.pages.dev");
  });

  it("adds https if missing from deploy URL", () => {
    const url = provider.getDeployUrl({ id: "d1", url: "my-site.pages.dev" });
    expect(url).toBe("https://my-site.pages.dev");
  });
});
