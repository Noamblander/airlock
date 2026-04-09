# Airlock — Integration Progress Tracker

Status legend:
- **Implemented + Tested** — Code complete with integration/e2e tests, verified working in production
- **Implemented** — Code complete, not yet tested end-to-end in production
- **Partial** — Scaffolded / metadata only, needs more work
- **Planned** — Not yet started

---

## Cloud Providers

| Provider | Status | Config UI | Deploy | Env Vars | Delete | Auth Middleware | Tests | Notes |
|----------|--------|-----------|--------|----------|--------|-----------------|-------|-------|
| **Vercel** | Implemented + Tested | Yes | Yes | Yes | Yes | `auth-middleware-vercel.ts.template` | `tests/integration/deploy/vercel.test.ts` | Tested in production with real deploys. SSO protection auto-disabled. |
| **AWS Amplify** | Implemented | Yes | Yes | Yes | Yes | `auth-middleware-generic.ts.template` | `tests/integration/deploy/aws.test.ts` | Mock-tested only. Needs real AWS credentials to verify. |
| **Cloudflare Pages** | Implemented | Yes | Yes | Yes | Yes | `auth-middleware-generic.ts.template` | `tests/integration/deploy/cloudflare.test.ts` | Mock-tested only. Needs real Cloudflare API token to verify. |
| **Netlify** | Implemented | Yes | Yes | Yes | Yes | `auth-middleware-generic.ts.template` | `tests/integration/deploy/netlify.test.ts` | Mock-tested only. Needs real Netlify token to verify. |

**Provider registry:** `src/lib/deploy/providers/registry.ts`
**Shared types:** `src/lib/deploy/providers/types.ts`

### What needs testing next
- [ ] AWS Amplify — real deploy with actual AWS credentials
- [ ] Cloudflare Pages — real deploy with actual Cloudflare token
- [ ] Netlify — real deploy with actual Netlify token
- [ ] Cross-provider auth middleware — verify `_oat` exchange works on non-Vercel hosts

---

## Deployment Frameworks

| Framework | Status | Build Config | Middleware Injection | Tests | Notes |
|-----------|--------|--------------|----------------------|-------|-------|
| **Next.js** | Implemented + Tested | Per-provider build settings | `middleware.js` (root) | Yes | Tested in production on Vercel. |
| **Vite** | Implemented | Per-provider build settings | `_middleware.js` | Yes (mock) | Not tested with a real Vite app deploy yet. |
| **Static** | Implemented | Per-provider build settings | `_middleware.js` | Yes (mock) | Not tested with a real static deploy yet. |

**Type definition:** `src/lib/deploy/types.ts` — `Framework = "nextjs" | "vite" | "static"`

### What needs testing next
- [ ] Deploy a Vite app through MCP and verify it works
- [ ] Deploy a static site through MCP and verify it works
- [ ] Verify auth middleware injection works for Vite and static frameworks

---

## Database Providers

| Provider | Status | CLAUDE.md Docs | Provisioning | Connection | Tests | Notes |
|----------|--------|----------------|--------------|------------|-------|-------|
| **PostgreSQL** | Partial | Yes — Prisma/Drizzle/pg | No | Via `DATABASE_URL` env | `tests/integration/database/providers.test.ts` | Docs/template generation works. No auto-provisioning from platform. |
| **MySQL** | Partial | Yes — Prisma/Drizzle/mysql2 | No | Via `DATABASE_URL` env | `tests/integration/database/providers.test.ts` | Docs/template generation works. No auto-provisioning. |
| **MongoDB** | Partial | Yes — Mongoose/native driver | No | Via `DATABASE_URL` env | `tests/integration/database/providers.test.ts` | Docs/template generation works. No auto-provisioning. |

**Schema:** `tenants.dbProvider` (text, nullable) + `tenants.dbConfig` (jsonb)
**Template generator:** `src/lib/templates/claude-md.ts`

### What needs testing next
- [ ] Full DB provisioning flow — auto-create a database when a tenant selects one
- [ ] Inject `DATABASE_URL` into deployed apps automatically
- [ ] Test CLAUDE.md output for each DB provider

---

## Authentication

| Method | Status | Where | Notes |
|--------|--------|-------|-------|
| **Email + Password** | Implemented + Tested | `src/app/login/page.tsx` | Supabase `signInWithPassword` / `signUp`. Tested in production. |
| **Google OAuth** | Implemented + Tested | `src/app/login/page.tsx`, `src/app/api/auth/login/route.ts` | Supabase `signInWithOAuth`. Tested in production. |
| **Email OTP (magic link)** | Implemented | `src/app/auth/published-app-login/page.tsx` | Used for published-app auth when no SSO redirect. |
| **SSO Redirect (platform → app)** | Implemented + Tested | `src/app/api/auth/app-redirect/route.ts` | Seamless auth handoff from dashboard to deployed apps. Tested. |
| **MCP Bearer JWT** | Implemented + Tested | `src/lib/mcp/auth.ts` | Token-based auth for MCP tool calls. Tested. |

**Session middleware:** `src/lib/supabase/middleware.ts`
**Published app auth flow:** `_oat` one-time token → `exchange-token` → `org-ai-session` cookie

### What needs testing next
- [ ] `authProvider` tenant field — currently defaults to `"google"`, not used to switch providers
- [ ] SAML / Azure AD / GitHub OAuth as additional auth providers
- [ ] Published-app login with email+password (currently only magic link)

---

## Languages & Stacks

| Language | Status | Notes |
|----------|--------|-------|
| **JavaScript / TypeScript** | Supported | All three frameworks (Next.js, Vite, static) are JS/TS ecosystems |
| **Python** | Planned | Not supported in deploy types or orchestration |
| **Go** | Planned | Not supported |
| **Rust** | Planned | Not supported |

### What needs testing next
- [ ] Python app deployment (FastAPI / Flask via Vercel Functions)
- [ ] Non-Node.js framework support

---

## Platform Features

| Feature | Status | Notes |
|---------|--------|-------|
| **MCP Deploy Tool** | Implemented + Tested | Full deploy flow via MCP protocol |
| **MCP Secrets Tool** | Implemented + Tested | `tests/integration/mcp/secrets-tool.test.ts` |
| **Admin Member Management** | Implemented | Invite, setup, role management |
| **Secret Management** | Implemented | AES-256-GCM encrypted secrets, per-project grants |
| **Dashboard Project Grid** | Implemented + Tested | Thumbnail previews, deploy count, auth redirect |
| **Live App Preview (iframe)** | Implemented + Tested | Browser-chrome frame with desktop/mobile toggle |
| **Screenshot Capture** | Implemented | Microlink API → Vercel Blob; triggers after deploy |
| **Deploy History** | Implemented | Per-project deployment table |
| **CLAUDE.md Generation** | Implemented + Tested | Per-tenant template with cloud/db/secrets config |
| **Usage Tracking** | Implemented | `usage_events` table logs deploys, costs |

---

## Test Coverage

| Test Suite | File | Type | Status |
|------------|------|------|--------|
| Vercel deploy | `tests/integration/deploy/vercel.test.ts` | Integration (mock HTTP) | Passing |
| AWS deploy | `tests/integration/deploy/aws.test.ts` | Integration (mock HTTP) | Passing |
| Cloudflare deploy | `tests/integration/deploy/cloudflare.test.ts` | Integration (mock HTTP) | Passing |
| Netlify deploy | `tests/integration/deploy/netlify.test.ts` | Integration (mock HTTP) | Passing |
| MCP deploy tool | `tests/integration/mcp/deploy-tool.test.ts` | Integration (mock HTTP) | Passing |
| MCP secrets tool | `tests/integration/mcp/secrets-tool.test.ts` | Integration | Passing |
| DB providers | `tests/integration/database/providers.test.ts` | Integration | Passing |
| Onboarding flow | `tests/e2e/onboarding.test.ts` | E2E (Playwright) | Needs verification |
| Settings flow | `tests/e2e/settings.test.ts` | E2E (Playwright) | Needs verification |
| Deploy flow | `tests/e2e/deploy-flow.test.ts` | E2E (Playwright) | Needs verification |

**Mock server:** `tests/mocks/server.ts` with per-provider handler files.

---

## Priority Roadmap

### Next up (high value)
1. Real-world test AWS Amplify deploy
2. Real-world test Cloudflare Pages deploy
3. Real-world test Netlify deploy
4. Vite framework real deploy test
5. Static site real deploy test

### Medium term
6. Database auto-provisioning (Neon Postgres, PlanetScale MySQL, MongoDB Atlas)
7. Python/FastAPI framework support
8. Additional auth providers (GitHub OAuth, Azure AD)
9. Custom domain support for deployed apps

### Future
10. Go / Rust deploy support
11. Multi-region deployments
12. Rollback / version management
13. CI/CD pipeline integration
