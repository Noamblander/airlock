# Enterprise Agentic Platform — Design Spec

**Date:** 2026-04-05
**Status:** Draft
**Author:** Co-designed with Claude

## 1. Overview

An enterprise infrastructure and governance layer that turns Claude into a full deployment platform. Non-technical employees use Claude (web or CLI) to build apps, agents, dashboards, and interactive specs, then say "publish this" — and the platform handles deployment, database provisioning, secrets injection, and access control automatically.

**Goal:** Replace tools like Lovable and Base44 with a secure, company-scoped agentic environment where any employee can create and share full applications without depending on developers or devops.

**GTM:** Start as internal tool for a small company (10–50 people), architect for multi-tenant SaaS from day one.

## 2. Architecture

Four layers:

### 2.1 Creation Layer
Claude is the IDE. Employees use Claude.ai (web) or Claude Code (CLI) to build. Claude reads a company-specific `CLAUDE.md` for context and calls MCP server tools for actions.

### 2.2 Platform Layer
A single Next.js application on Vercel. Serves both:
- **MCP server endpoints** — tools Claude calls (deploy, secrets, database, projects, agents, usage)
- **Admin dashboard UI** — project gallery, usage analytics, secrets vault, user management

One codebase, one deploy, shared database and auth.

### 2.3 Infrastructure Layer
- **Supabase** — PostgreSQL (with RLS for multi-tenancy), Auth (SSO), Storage, Realtime, Edge Functions
- **Vercel** — hosts each published project as its own Vercel project. Auto SSL, edge CDN, cron jobs.
- **Encrypted vault** — API keys stored AES-256-GCM encrypted in Supabase. Decryption key in platform server env vars only.

### 2.4 Published Apps Layer
Each published app lives at its own Vercel URL (e.g., `sales-dash.acme.vercel.app`). All apps have auth middleware automatically injected — only authenticated company employees can access them.

## 3. MCP Server Tools

Six tools in three categories:

### 3.1 Core Tools

**`deploy`** — Publishes code to a new or existing Vercel project. The "publish this" magic.
```
deploy({
  project_name: "q4-sales-dashboard",
  files: { "index.html": "...", "app.js": "...", ... },
  framework: "nextjs" | "static" | "vite",
  env_vars: ["OPENAI_API_KEY", "SUPABASE_URL"],
  description: "Sales dashboard with AI insights",
  folder: "/marketing/dashboards"
})
→ { url: "q4-sales-dashboard.acme.vercel.app", status: "live" }
```

**Payload limits:** Max 10MB total file payload per deploy call. If exceeded, the tool returns an error asking Claude to split into smaller files or remove unnecessary assets. This covers the vast majority of dashboard/app use cases. Binary assets (images, fonts) should be referenced via external URLs or Supabase Storage, not inlined.

**Partial updates:** For updating existing projects, `deploy` accepts an optional `update_files` field instead of `files`. This sends only the changed files — the platform merges with the existing file snapshot from `deployments`. This avoids the round-trip of fetching all source just to change one file.

**Framework build configuration:**
| Framework | Build command | Output dir | Notes |
|-----------|-------------|------------|-------|
| `nextjs` | `next build` | `.next` | Full-stack, supports API routes + SSR |
| `vite` | `vite build` | `dist` | SPA, client-side only |
| `static` | none | root | HTML/CSS/JS served as-is |

**Error responses:** All MCP tools return errors in a consistent format:
```
{ error: true, code: "PAYLOAD_TOO_LARGE" | "SECRET_NOT_FOUND" | "DEPLOY_FAILED" | ..., message: "Human-readable explanation" }
```
Claude receives the error and communicates it to the employee in natural language.

**`get_available_secrets`** — Lists API keys available for the tenant. Claude sees names only, never values.
```
get_available_secrets()
→ [{ name: "OPENAI_API_KEY", description: "GPT-4 access", added_by: "admin" }, ...]
```

**`provision_database`** — Creates an isolated PostgreSQL schema for a project.
```
provision_database({
  project_name: "q4-sales-dashboard",
  tables: [{
    name: "leads",
    columns: [
      { name: "id", type: "uuid", primary_key: true, default: "gen_random_uuid()" },
      { name: "name", type: "text", nullable: false },
      { name: "score", type: "integer", nullable: true },
      { name: "created_at", type: "timestamptz", default: "now()" }
    ]
  }]
})
→ { schema: "proj_q4_sales_dashboard", connection_string: "injected as env var" }
```

**Supported column types:** `text`, `integer`, `bigint`, `boolean`, `uuid`, `timestamptz`, `jsonb`, `real`, `numeric`. These map directly to PostgreSQL types.

**Supported constraints:** `primary_key` (bool), `nullable` (bool, default true), `default` (SQL expression string), `unique` (bool). Foreign keys and indexes are not supported in MVP — keeps the schema simple for non-technical users.

**Naming conflicts:** If a schema with the same name already exists for this project, the tool adds the new tables to the existing schema (idempotent). If a table name conflicts, returns an error with code `TABLE_ALREADY_EXISTS`.

### 3.2 Management Tools

**`list_projects`** — Browse existing company projects, filterable by folder.
```
list_projects({ folder: "/marketing" })
→ [{ name: "q4-sales-dashboard", url: "...", last_deployed: "2h ago", author: "Sarah" }, ...]
```

**`get_project`** — Full details + source code of an existing project for modification.
```
get_project({ name: "q4-sales-dashboard" })
→ { files: {...}, env_vars: [...], db_schema: {...}, deploy_history: [...] }
```

**`get_usage`** — Usage analytics Claude can query directly.
```
get_usage({ period: "last_30_days" })
→ { total_deploys: 47, api_calls: 12340, top_projects: [...], estimated_cost: "$23.50" }
```

### 3.3 Agent Tools

**`schedule_agent`** — Deploys a background agent on a cron schedule.
```
schedule_agent({
  name: "daily-report-bot",
  code: "...",
  schedule: "0 9 * * MON-FRI",
  env_vars: ["OPENAI_API_KEY", "SLACK_WEBHOOK"],
  description: "Generates daily sales summary and posts to Slack"
})
→ { agent_id: "...", next_run: "tomorrow 9:00 AM", logs_url: "..." }
```

**Agent runtime environment:**
- Runtime: Node.js 20 (Vercel Serverless Functions)
- Max execution time: 60 seconds (Vercel Pro plan limit)
- Available packages: `node-fetch`, `@supabase/supabase-js`, `openai` are pre-installed. No custom dependency installation in MVP — agents use built-in packages only.
- Environment variables accessed via `process.env.VARIABLE_NAME`
- `code` field max size: 500KB. Agent code is a single file (entry point). For complex agents, Claude should keep logic consolidated.
- Minimum schedule interval: 5 minutes (enforced by platform, not just CLAUDE.md)
- Invalid cron expressions return error with code `INVALID_CRON`

### 3.4 How Claude Connects

- **Claude Code users:** MCP server config in `.mcp.json`. Server runs locally, calls platform API.
- **Claude.ai users:** Remote MCP server via OAuth. Employee authenticates once, Claude can call all tools.
- Both hit the same platform API — the MCP server is a thin adapter.

## 4. Data Model

Eight tables in Supabase PostgreSQL. Row-Level Security (RLS) on every table ensures tenant isolation.

### 4.1 Core Tables

**`tenants`** — Each company.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| name | text | Company display name |
| slug | text | URL-safe identifier |
| domain | text | e.g., "acme.com" |
| auth_provider | text | "google" / "azure" / "saml" |
| vercel_team_id | text | Connected Vercel team |
| plan | text | "free" / "pro" (for future SaaS) |
| created_at | timestamptz | |

**`users`** — Employees.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | |
| email | text | |
| name | text | |
| role | text | "admin" / "member" |
| auth_provider_id | text | SSO identity |
| created_at | timestamptz | |

**`projects`** — Each published app/agent.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | |
| folder_id | uuid (fk → folders) | nullable |
| name | text | |
| slug | text | URL-safe |
| description | text | |
| framework | text | "nextjs" / "vite" / "static" |
| vercel_project_id | text | |
| vercel_url | text | |
| status | text | "live" / "stopped" |
| db_schema_name | text | nullable — set if project has DB |
| created_by | uuid (fk → users) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**`folders`** — Hierarchical organization.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | |
| parent_id | uuid (fk → folders) | nullable, self-referencing |
| name | text | |
| path | text | Materialized path, e.g., "/marketing/dashboards". Derived from parent_id chain — `parent_id` is source of truth. `path` is recomputed on folder rename/move via a trigger. |
| created_by | uuid (fk → users) | |
| created_at | timestamptz | |

### 4.2 Supporting Tables

**`deployments`** — Deploy history per project.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | Denormalized for RLS |
| project_id | uuid (fk → projects) | |
| vercel_deploy_id | text | |
| status | text | "success" / "failed" |
| url | text | Deployment-specific URL |
| files_snapshot | jsonb | Source files for rollback |
| triggered_by | uuid (fk → users) | |
| created_at | timestamptz | |

**`secrets`** — Encrypted API keys per tenant.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | |
| name | text | e.g., "OPENAI_API_KEY" |
| description | text | |
| encrypted_value | text | AES-256-GCM encrypted |
| key_version | int | Encryption key version, for future key rotation |
| added_by | uuid (fk → users) | |
| created_at | timestamptz | |

**`project_secrets`** — Which projects can use which secrets.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | Denormalized for RLS |
| project_id | uuid (fk → projects) | |
| secret_id | uuid (fk → secrets) | |
| granted_at | timestamptz | |

**`agents`** — Scheduled background jobs.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | Denormalized for RLS |
| project_id | uuid (fk → projects) | |
| schedule | text | Cron expression |
| trigger | text | "cron" / "webhook" |
| status | text | "active" / "paused" |
| last_run_at | timestamptz | |
| next_run_at | timestamptz | |
| error_count | int | |

**`usage_events`** — Append-only activity log.
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (pk) | |
| tenant_id | uuid (fk → tenants) | |
| project_id | uuid (fk → projects) | nullable |
| user_id | uuid (fk → users) | |
| event_type | text | "deploy" / "api_call" / "db_query" / "agent_run" |
| metadata | jsonb | Event-specific data |
| cost_cents | int | Estimated cost |
| created_at | timestamptz | |

### 4.3 Security Model

**RLS policy on every table:**
```sql
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

**Published app DB isolation:**
```sql
-- Each project gets its own schema:
CREATE SCHEMA proj_q4_sales_dashboard;
-- Connection string scoped to that schema only.
```

**Secrets encryption:** AES-256-GCM at rest. Decryption key stored in platform server environment variable — never in the database. Decrypted only when injecting into Vercel env vars during deploy. Each encrypted value stores a `key_version` field so that if the master encryption key needs rotation, the platform can re-encrypt secrets incrementally. Key rotation mechanism is post-MVP but the schema supports it from day one.

## 5. Deploy Flow

Full sequence when an employee says "publish this":

1. **Claude generates the code** — Next.js, Vite, or static, depending on requirements.
2. **Claude calls `get_available_secrets()`** — discovers available API keys, decides which to use.
3. **Claude calls `provision_database()`** (if needed) — platform creates isolated Postgres schema.
4. **Claude calls `deploy()`** with files, project name, and secret references.
5. **Platform orchestrates:**
   - a. Creates or updates Vercel project via API
   - b. Decrypts referenced secrets from vault
   - c. Injects secrets as Vercel environment variables
   - d. Pushes files via Vercel deployment API
   - e. **Injects auth middleware** (see 5.1 below)
   - f. Logs to `usage_events` and `deployments` tables
6. **Returns live URL** to Claude, who tells the employee.

### 5.1 Published App Auth Flow

Every published app gets a Vercel Edge Middleware file injected automatically. This middleware runs before any page or API route in the published app.

**Flow when an employee visits a published app:**
1. Browser requests `sales-dash.acme.vercel.app`
2. Edge Middleware checks for `sb-access-token` cookie
3. **If no cookie:** Redirect to `platform.vercel.app/auth/published-app-login?app=sales-dash&tenant=acme&redirect=<original-url>`
4. **Platform login page:** Shows SSO login button (Google/Azure) with company branding. Supports Hebrew.
5. **After SSO success:** Platform verifies user belongs to the correct tenant, sets a signed `sb-access-token` cookie scoped to `*.acme.vercel.app`, redirects back to the original URL.
6. **If cookie exists:** Middleware validates the JWT signature and checks `tenant_id` matches the app's tenant. If valid, request proceeds. If expired/invalid, redirect to login.

**Key details:**
- Cookie is scoped to `*.acme.vercel.app` — one login covers all apps for that company
- JWT contains: `user_id`, `tenant_id`, `email`, `role`, `exp` (24h expiry)
- The middleware file is generated from `templates/auth-middleware.ts.template` with the tenant's Supabase project URL and JWT secret baked in
- Employee-written app code never handles auth — it's fully transparent

**Updates:** "Update the sales dashboard" → Claude calls `get_project()` to fetch current source, modifies it, calls `deploy()` again. Same URL, new version, full history preserved.

**Agents:** Same flow but Claude calls `schedule_agent()` instead. Platform deploys as Vercel Serverless Function + Cron Job.

## 6. Admin Dashboard

### 6.1 All Employees

- **Project Gallery** — browse all company projects by folders. Search, filter by status/author/framework. Click to open live URL.
- **My Projects** — projects I created. Quick access to URLs, deploy history, logs.
- **Folders** — nested folder tree. Organize by department, project type, etc.

### 6.2 Admin Only

- **Usage & Analytics** — deploys, API calls, DB usage, estimated costs. Per-project and per-user. Charts + tables. CSV export.
- **Secrets Vault** — add/revoke/rotate API keys. See which projects use which secrets.
- **User Management** — invite/remove employees. Set roles (admin/member). View per-user activity.
- **Agent Monitor** — all running agents. Status, last run, error rate, logs. Pause/resume/kill controls.

### 6.3 Hebrew / RTL Support

- Built with `next-intl` for i18n (EN + HE).
- Language toggle in header: EN | HE.
- `dir="rtl"` on `<html>` when Hebrew selected.
- Tailwind CSS `rtl:` variant for layout flipping.
- All labels, dates, numbers localized.
- Auth login page supports Hebrew.
- Published apps: CLAUDE.md instructs Claude to generate RTL code when user writes in Hebrew. Not enforced — employees choose per project.

## 7. Security

### 7.1 Identity (Who are you?)

- **Dashboard:** Supabase Auth via company SSO (Google Workspace / Azure AD / SAML). Only verified @company.com emails.
- **MCP calls:** JWT token with tenant_id + user_id + role. Issued at setup, refreshed automatically.
- **Published apps:** Injected auth middleware checks Supabase session. Redirects to SSO login if not authenticated.

### 7.2 Authorization (What can you do?)

- **Roles:** `admin` — manage secrets, users, analytics, kill agents. `member` — create projects, deploy, browse gallery.
- **RLS:** Every DB query filtered by tenant_id from JWT. Cross-tenant access impossible.
- **Secrets:** Members reference secrets by name in deploys. Only admins add/view/rotate values.

### 7.3 Data Protection

- **Secrets:** AES-256-GCM encrypted at rest. Never logged, never sent to Claude.
- **Project data:** Each project's DB schema isolated. Connection strings scoped.
- **Audit trail:** Every deploy, secret access, agent run logged in `usage_events`.

### 7.4 Guardrails

- **Rate limits:** Per-user deploy limit, configurable by admin.
- **Code scanning:** Before pushing files to Vercel, the platform scans all source files using regex patterns for common secret formats (API keys matching `sk-`, `sk_live_`, `ghp_`, `xoxb-`, AWS key patterns, etc.) and high-entropy strings longer than 30 characters that match base64/hex patterns. This is a best-effort heuristic, not a guarantee. When a potential secret is detected, the deploy is blocked and Claude receives an error: `{ error: true, code: "HARDCODED_SECRET_DETECTED", message: "Possible API key found in app.js line 42. Use env_vars instead of hardcoding secrets.", file: "app.js", line: 42 }`. Claude then fixes the code to reference secrets via environment variables and redeploys.
- **Resource limits:** Max DB size per project. Max serverless function execution time. Configurable.
- **Agent kill switch:** Admin can pause/kill any agent from dashboard. Auto-pause after N consecutive errors.

## 8. Company Onboarding

1. **Admin signs up** — creates tenant (company name, slug, domain).
2. **Connects auth provider** — Google Workspace / Azure AD / SAML via Supabase Auth.
3. **Connects Vercel team** — OAuth flow gives platform a deploy token scoped to their team.
4. **Configures secrets** — adds API keys (OpenAI, Stripe, etc.) to encrypted vault.
5. **Platform generates config** — CLAUDE.md template + MCP server config.
6. **Invites employees** — email invites or auto-join via company domain. Each gets MCP auth token + Claude setup instructions.

### 8.1 Generated CLAUDE.md Template

```markdown
# {Company Name} — Claude Configuration

## Company
You are working for {Company Name}. When publishing apps, use the MCP tools available to you.

## Deployment
- To publish any app, use the `deploy` tool. Never ask the user to deploy manually.
- Available frameworks: nextjs, vite, static
- All published apps are automatically secured — do not add your own auth.

## Database
- To give an app persistent storage, use `provision_database` first.
- Use Supabase client libraries for database access in app code.

## Secrets
- Available API keys: {list of secret names}
- Reference them by name in the `env_vars` field when deploying. Never hardcode.

## Conventions
- Default language: {Hebrew (RTL) | English}
- Use Tailwind CSS for styling.
- Use shadcn/ui components when building UI.
- Always include error handling and loading states.

## Guardrails
- Max {N} deploys per day per user.
- Do not deploy apps that store PII without explicit user consent.
- Do not create agents that run more frequently than every {N} minutes.
```

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| i18n / RTL | next-intl (EN + HE) |
| Charts | Recharts |
| State | React Server Components + SWR |
| Forms | React Hook Form + Zod |
| API | Next.js Route Handlers |
| MCP Server | @modelcontextprotocol/sdk |
| Database | Supabase (PostgreSQL) |
| ORM | Drizzle ORM |
| Auth | Supabase Auth (SSO) |
| Encryption | Node.js crypto (AES-256-GCM) |
| Deploy target | Vercel API (@vercel/client) |
| Hosting | Vercel |

## 10. Project Structure

```
organization-ai/
├── src/
│   ├── app/
│   │   ├── [locale]/                 # i18n: /en/... and /he/...
│   │   │   ├── dashboard/            # Project gallery, my projects, folders
│   │   │   │   ├── page.tsx
│   │   │   │   ├── projects/[id]/page.tsx
│   │   │   │   ├── agents/page.tsx
│   │   │   │   └── folders/page.tsx
│   │   │   ├── admin/                # Admin-only pages
│   │   │   │   ├── usage/page.tsx
│   │   │   │   ├── secrets/page.tsx
│   │   │   │   ├── users/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── onboarding/           # Tenant setup wizard
│   │   │   └── layout.tsx            # Shell: sidebar, header, RTL
│   │   └── api/
│   │       ├── mcp/
│   │       │   ├── route.ts          # SSE transport
│   │       │   └── tools/
│   │       │       ├── deploy.ts
│   │       │       ├── secrets.ts
│   │       │       ├── database.ts
│   │       │       ├── projects.ts
│   │       │       ├── agents.ts
│   │       │       └── usage.ts
│   │       ├── auth/
│   │       ├── webhooks/
│   │       └── cron/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   └── client.ts
│   │   ├── auth/
│   │   │   ├── middleware.ts
│   │   │   └── published-app-middleware.ts
│   │   ├── secrets/vault.ts
│   │   ├── deploy/
│   │   │   ├── vercel.ts
│   │   │   └── injector.ts
│   │   ├── mcp/server.ts
│   │   └── i18n/
│   │       ├── en.json
│   │       └── he.json
│   └── components/
│       ├── dashboard/
│       ├── admin/
│       └── shared/
├── cli/setup.ts                      # Optional: npx org-ai setup
├── templates/
│   ├── CLAUDE.md.template
│   └── auth-middleware.ts.template
├── supabase/
│   ├── config.toml
│   └── migrations/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── .env.example
```

## 11. MVP Phases

The MVP is split into 3 phases, each shippable independently:

### Phase 1: Deploy + Secrets + Dashboard (core loop)
- MCP server with 4 tools: `deploy`, `get_available_secrets`, `list_projects`, `get_project`
- Admin dashboard: project gallery + secrets vault + user management
- SSO auth (Google Workspace)
- Auto auth middleware injection on published apps
- CLAUDE.md generation
- Onboarding wizard
- `stop_project` action in dashboard (sets status to "stopped", removes Vercel deployment)

### Phase 2: Database + Agents + Analytics
- `provision_database` tool
- `schedule_agent` tool
- `get_usage` tool
- Usage & analytics dashboard page
- Agent monitor dashboard page
- Deploy history + rollback

### Phase 3: Organization + i18n
- Folder organization (UI + MCP integration)
- Hebrew / RTL support (next-intl, all dashboard pages)
- Auth login page Hebrew support

### Post-MVP
- Azure AD / SAML auth providers
- Webhook-triggered agents
- Custom domains for published apps
- Billing / plan tiers for SaaS
- Team permissions (view/edit per folder)
- App templates gallery
- Real-time collaboration (Supabase Realtime)
- CLI tool (`npx org-ai setup`)
- Encryption key rotation mechanism
