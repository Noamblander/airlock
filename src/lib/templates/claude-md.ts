import { readFileSync } from "fs";
import { join } from "path";

type Tenant = {
  name: string;
  slug: string;
  domain: string;
  cloudProvider?: string;
  dbProvider?: string | null;
};

const CLOUD_PROVIDER_LABELS: Record<string, string> = {
  vercel: "Vercel",
  aws: "AWS (Amplify)",
  cloudflare: "Cloudflare Pages",
  netlify: "Netlify",
};

const DB_SECTIONS: Record<string, string> = {
  postgres: `## Database
- Database type: PostgreSQL
- Connection available as: DATABASE_URL environment variable
- Use Prisma, Drizzle, or pg/postgres.js to connect`,
  mysql: `## Database
- Database type: MySQL
- Connection available as: DATABASE_URL environment variable
- Use Prisma, Drizzle, or mysql2 to connect`,
  mongodb: `## Database
- Database type: MongoDB
- Connection available as: DATABASE_URL environment variable
- Use Mongoose or the native MongoDB driver to connect`,
};

const DB_CONVENTIONS: Record<string, string> = {
  postgres: `- For database access, prefer Prisma or Drizzle ORM with PostgreSQL.`,
  mysql: `- For database access, prefer Prisma or Drizzle ORM with MySQL.`,
  mongodb: `- For database access, prefer Mongoose with MongoDB. Use schemas for data validation.`,
};

export function generateClaudeMd(tenant: Tenant, secretNames: string[]): string {
  const templatePath = join(process.cwd(), "templates", "CLAUDE.md.template");
  let template = readFileSync(templatePath, "utf-8");

  const cloudLabel = CLOUD_PROVIDER_LABELS[tenant.cloudProvider || "vercel"] || "Vercel";
  const dbSection = tenant.dbProvider ? (DB_SECTIONS[tenant.dbProvider] || "") : "";
  const dbConventions = tenant.dbProvider ? (DB_CONVENTIONS[tenant.dbProvider] || "") : "";

  template = template.replace(/\{Company Name\}/g, tenant.name);
  template = template.replace("{Cloud Provider}", cloudLabel);
  template = template.replace(
    "{Secret Names}",
    secretNames.length > 0 ? secretNames.join(", ") : "(none configured yet)"
  );
  template = template.replace("{Database Section}", dbSection);
  template = template.replace("{Database Conventions}", dbConventions);

  return template;
}
