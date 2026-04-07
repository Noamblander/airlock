import { describe, it, expect } from "vitest";
import { AwsProvider } from "@/lib/deploy/providers/aws";
import type { ProviderConfig, ProviderFile } from "@/lib/deploy/providers/types";

const config: ProviderConfig = {
  token: "test-aws-token",
  teamId: "123456789012",
  region: "us-east-1",
};

const testFiles: ProviderFile[] = [
  { path: "index.html", content: "<h1>Hello AWS</h1>" },
];

describe("AwsProvider", () => {
  const provider = new AwsProvider();

  it("has correct name", () => {
    expect(provider.name).toBe("aws");
  });

  it("creates an Amplify app", async () => {
    const project = await provider.createProject("aws-test-app", "nextjs", config);
    expect(project).toHaveProperty("id");
    expect(project.id).toBe("aws_aws-test-app");
    expect(project).toHaveProperty("name");
  });

  it("deploys files to Amplify", async () => {
    const deployment = await provider.deploy("aws_test", testFiles, "nextjs", config);
    expect(deployment).toHaveProperty("id");
    expect(deployment).toHaveProperty("url");
    expect(deployment.url).toContain("amplifyapp.com");
  });

  it("sets environment variables", async () => {
    await expect(
      provider.setEnvVars("aws_test", [
        { key: "DB_URL", value: "postgres://test", target: ["production"] },
      ], config)
    ).resolves.toBeUndefined();
  });

  it("deletes an app", async () => {
    await expect(
      provider.deleteDeployment("aws_test", config)
    ).resolves.toBeUndefined();
  });

  it("generates correct deploy URL", () => {
    const url = provider.getDeployUrl({ id: "job_1", url: "main.app123.amplifyapp.com" });
    expect(url).toBe("https://main.app123.amplifyapp.com");
  });
});
