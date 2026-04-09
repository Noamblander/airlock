import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain").notNull(),
  authProvider: text("auth_provider").notNull().default("google"),
  cloudProvider: text("cloud_provider").notNull().default("vercel"),
  cloudTeamId: text("cloud_team_id"),
  cloudApiToken: text("cloud_api_token"),
  cloudConfig: jsonb("cloud_config").$type<Record<string, unknown>>().default({}),
  dbProvider: text("db_provider"),
  dbConfig: jsonb("db_config").$type<Record<string, unknown>>().default({}),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("member"), // "admin" | "member"
  language: text("language").notNull().default("en"),
  authProviderId: text("auth_provider_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  parentId: uuid("parent_id"), // self-referencing, nullable
  name: text("name").notNull(),
  path: text("path").notNull(), // materialized path e.g. "/marketing/dashboards"
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  folderId: uuid("folder_id").references(() => folders.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").default(""),
  framework: text("framework").notNull().default("static"), // "nextjs" | "vite" | "static"
  providerProjectId: text("provider_project_id"),
  deployUrl: text("deploy_url"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("live"), // "live" | "stopped"
  visibility: text("visibility").notNull().default("organization"), // "private" | "organization" | "link"
  dbSchemaName: text("db_schema_name"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  providerDeployId: text("provider_deploy_id"),
  status: text("status").notNull().default("success"), // "success" | "failed"
  url: text("url"),
  filesSnapshot: jsonb("files_snapshot"), // Record<string, string>
  triggeredBy: uuid("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const secrets = pgTable("secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description").default(""),
  encryptedValue: text("encrypted_value").notNull(),
  keyVersion: integer("key_version").notNull().default(1),
  addedBy: uuid("added_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectSecrets = pgTable("project_secrets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  secretId: uuid("secret_id")
    .notNull()
    .references(() => secrets.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const projectShares = pgTable("project_shares", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  grantedBy: uuid("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  schedule: text("schedule"),
  trigger: text("trigger").notNull().default("cron"), // "cron" | "webhook"
  status: text("status").notNull().default("active"), // "active" | "paused"
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  errorCount: integer("error_count").notNull().default(0),
});

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  projectId: uuid("project_id").references(() => projects.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  eventType: text("event_type").notNull(), // "deploy" | "api_call" | "db_query" | "agent_run"
  metadata: jsonb("metadata"),
  costCents: integer("cost_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
