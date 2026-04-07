import { readFileSync } from "fs";
import { join } from "path";
import type { Framework, TenantConfig } from "./types";
import type { CloudProvider } from "./providers/types";

export function injectAuthMiddleware(
  files: Record<string, string>,
  tenantConfig: TenantConfig,
  framework: Framework,
  cloudProvider: CloudProvider = "vercel"
): Record<string, string> {
  const templateName =
    cloudProvider === "vercel"
      ? "auth-middleware-vercel.ts.template"
      : "auth-middleware-generic.ts.template";

  const templatePath = join(process.cwd(), "templates", templateName);
  let template = readFileSync(templatePath, "utf-8");

  template = template
    .replace(/\{\{PLATFORM_URL\}\}/g, tenantConfig.platformUrl)
    .replace(/\{\{TENANT_SLUG\}\}/g, tenantConfig.tenantSlug)
    .replace(/\{\{JWT_SECRET\}\}/g, tenantConfig.jwtSecret);

  const result = { ...files };

  if (framework === "nextjs") {
    result["middleware.ts"] = template;
  } else {
    result["_middleware.js"] = template;
  }

  return result;
}
