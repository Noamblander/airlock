import { describe, it, expect } from "vitest";
import { getProvider } from "@/lib/deploy/providers/registry";
import { VercelProvider } from "@/lib/deploy/providers/vercel";
import { AwsProvider } from "@/lib/deploy/providers/aws";
import { CloudflareProvider } from "@/lib/deploy/providers/cloudflare";
import { NetlifyProvider } from "@/lib/deploy/providers/netlify";

describe("Provider Registry", () => {
  it("returns VercelProvider for 'vercel'", () => {
    const provider = getProvider("vercel");
    expect(provider).toBeInstanceOf(VercelProvider);
    expect(provider.name).toBe("vercel");
  });

  it("returns AwsProvider for 'aws'", () => {
    const provider = getProvider("aws");
    expect(provider).toBeInstanceOf(AwsProvider);
    expect(provider.name).toBe("aws");
  });

  it("returns CloudflareProvider for 'cloudflare'", () => {
    const provider = getProvider("cloudflare");
    expect(provider).toBeInstanceOf(CloudflareProvider);
    expect(provider.name).toBe("cloudflare");
  });

  it("returns NetlifyProvider for 'netlify'", () => {
    const provider = getProvider("netlify");
    expect(provider).toBeInstanceOf(NetlifyProvider);
    expect(provider.name).toBe("netlify");
  });

  it("throws for unknown provider", () => {
    expect(() => getProvider("unknown" as never)).toThrow("Unknown cloud provider");
  });
});

describe("Provider Deploy Flow", () => {
  const providers = ["vercel", "aws", "cloudflare", "netlify"] as const;

  const configs = {
    vercel: { token: "test-token", teamId: "team_123" },
    aws: { token: "test-token", teamId: "123456789012", region: "us-east-1" },
    cloudflare: { token: "test-token", teamId: "cf-account-123" },
    netlify: { token: "test-token", teamId: "my-team" },
  };

  const files = [
    { path: "index.html", content: "<h1>Test</h1>" },
    { path: "app.js", content: "console.log('hello');" },
  ];

  for (const providerName of providers) {
    describe(`${providerName} full deploy flow`, () => {
      it("creates project -> deploys -> sets env vars -> deletes", async () => {
        const provider = getProvider(providerName);
        const config = configs[providerName];

        // Create project
        const project = await provider.createProject("e2e-test", "static", config);
        expect(project.id).toBeTruthy();
        expect(project.name).toBeTruthy();

        // Deploy
        const deployment = await provider.deploy(project.id, files, "static", config);
        expect(deployment.id).toBeTruthy();
        expect(deployment.url).toBeTruthy();

        // Deploy URL
        const url = provider.getDeployUrl(deployment);
        expect(url).toMatch(/^https:\/\//);

        // Set env vars
        await expect(
          provider.setEnvVars(project.id, [
            { key: "API_KEY", value: "sk-test", target: ["production"] },
            { key: "DB_URL", value: "postgres://test", target: ["production", "preview"] },
          ], config)
        ).resolves.toBeUndefined();

        // Delete
        await expect(
          provider.deleteDeployment(project.id, config)
        ).resolves.toBeUndefined();
      });
    });
  }
});
