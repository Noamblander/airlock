import type { CloudProvider, DeployProvider } from "./types";
import { VercelProvider } from "./vercel";
import { AwsProvider } from "./aws";
import { CloudflareProvider } from "./cloudflare";
import { NetlifyProvider } from "./netlify";

const providers: Record<CloudProvider, () => DeployProvider> = {
  vercel: () => new VercelProvider(),
  aws: () => new AwsProvider(),
  cloudflare: () => new CloudflareProvider(),
  netlify: () => new NetlifyProvider(),
};

export function getProvider(type: CloudProvider): DeployProvider {
  const factory = providers[type];
  if (!factory) {
    throw new Error(`Unknown cloud provider: ${type}`);
  }
  return factory();
}
