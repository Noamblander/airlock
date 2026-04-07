import { describe, it, expect } from "vitest";
import { getProvider } from "@/lib/deploy/providers/registry";

describe("Secret Injection via Provider", () => {
  const providers = ["vercel", "aws", "cloudflare", "netlify"] as const;

  const configs = {
    vercel: { token: "test-token", teamId: "team_123" },
    aws: { token: "test-token", teamId: "123456789012", region: "us-east-1" },
    cloudflare: { token: "test-token", teamId: "cf-account-123" },
    netlify: { token: "test-token", teamId: "my-team" },
  };

  for (const providerName of providers) {
    it(`injects secrets into ${providerName} project`, async () => {
      const provider = getProvider(providerName);
      const config = configs[providerName];

      const project = await provider.createProject("secret-test", "static", config);

      const secrets = [
        { key: "OPENAI_API_KEY", value: "sk-test-key", target: ["production", "preview"] },
        { key: "DATABASE_URL", value: "postgres://user:pass@host/db", target: ["production", "preview"] },
        { key: "STRIPE_SECRET", value: "sk_test_stripe", target: ["production"] },
      ];

      await expect(
        provider.setEnvVars(project.id, secrets, config)
      ).resolves.toBeUndefined();
    });

    it(`handles empty secrets for ${providerName}`, async () => {
      const provider = getProvider(providerName);
      const config = configs[providerName];

      await expect(
        provider.setEnvVars("some-project", [], config)
      ).resolves.toBeUndefined();
    });
  }
});
