import { readFileSync } from "fs";
import { join } from "path";
import type { Framework, TenantConfig } from "./types";

export function injectAuthMiddleware(
  files: Record<string, string>,
  tenantConfig: TenantConfig,
  framework: Framework
): Record<string, string> {
  const templatePath = join(
    process.cwd(),
    "templates",
    "auth-middleware.ts.template"
  );
  let template = readFileSync(templatePath, "utf-8");

  // Replace template variables
  template = template
    .replace(/\{\{PLATFORM_URL\}\}/g, tenantConfig.platformUrl)
    .replace(/\{\{TENANT_SLUG\}\}/g, tenantConfig.tenantSlug)
    .replace(/\{\{JWT_SECRET\}\}/g, tenantConfig.jwtSecret);

  const result = { ...files };

  if (framework === "nextjs") {
    // Next.js uses middleware.ts at root
    result["middleware.ts"] = template;
  } else {
    // Vite/static use Vercel Edge Middleware
    result["_middleware.js"] = template;
  }

  return result;
}
