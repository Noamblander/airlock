import { readFileSync } from "fs";
import { join } from "path";

type Tenant = {
  name: string;
  slug: string;
  domain: string;
};

export function generateClaudeMd(tenant: Tenant, secretNames: string[]): string {
  const templatePath = join(process.cwd(), "templates", "CLAUDE.md.template");
  let template = readFileSync(templatePath, "utf-8");

  template = template.replace(/\{Company Name\}/g, tenant.name);
  template = template.replace(
    "{Secret Names}",
    secretNames.length > 0 ? secretNames.join(", ") : "(none configured yet)"
  );

  return template;
}
