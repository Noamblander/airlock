<p align="center">
  <h1 align="center">Airlock</h1>
  <p align="center">
    The open-source platform that lets anyone in your org deploy AI-built apps to the cloud — no DevOps needed.
  </p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#the-problem">The Problem</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FNoamblander%2Fairlock&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,DATABASE_URL,ENCRYPTION_KEY,ENCRYPTION_KEY_VERSION,JWT_SECRET&envDescription=Supabase%20and%20database%20credentials%20needed%20to%20run%20Airlock.%20See%20the%20README%20for%20details.&envLink=https%3A%2F%2Fgithub.com%2FNoamblander%2Fairlock%23environment-variables&project-name=airlock&repository-name=airlock">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

---

## The Problem

AI coding tools like Claude Code, Lovable, and Base44 let anyone build full applications in hours. But there's a gap: **deploying and sharing those apps still requires DevOps knowledge.**

Product managers build interactive specs. Marketing creates dashboards. Teams automate workflows with AI agents. But when it comes time to actually ship — to get a live URL they can share — they hit a wall. They need someone to set up hosting, configure databases, manage API keys, and handle deployments.

**Airlock bridges that gap.** DevOps sets up the infrastructure once. After that, anyone on the team can deploy through their AI coding tool — just say "deploy this" and it's live.

## How It Works

```
┌─────────────────┐     MCP Protocol     ┌──────────────┐     Vercel API     ┌─────────────┐
│  Claude Code /  │ ──────────────────▶  │   Airlock  │ ──────────────▶   │   Vercel    │
│  AI Tool        │                      │   Platform   │                    │   (live)    │
└─────────────────┘                      └──────────────┘                    └─────────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │  Supabase (auth +   │
                                    │  Postgres + secrets) │
                                    └─────────────────────┘
```

1. **Admin sets up once** — connects Vercel, configures API keys, invites team members
2. **Members connect Claude Code** — one-click copy-paste of MCP connection settings
3. **Build and deploy** — tell Claude "build me a dashboard and deploy it" — done
4. **Track everything** — admin dashboard shows all projects, deployments, and usage

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Supabase](https://supabase.com/) project (free tier works)
- A [Vercel](https://vercel.com/) account with a team

### Setup

```bash
# Clone the repo
git clone https://github.com/Noamblander/airlock.git
cd airlock

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:3000` — the app will guide you through:

1. **Infrastructure setup** (`/setup`) — enter your Supabase credentials and database URL. Airlock runs migrations automatically.
2. **Organization onboarding** (`/onboarding`) — set your company name, connect Vercel, and optionally add API secrets (like OpenAI keys).
3. **Invite your team** — from the admin dashboard, invite members and generate setup messages you can send via Slack/email.
4. **Members connect** — each member copies their connection settings into Claude Code with one click. That's it.

### Environment Variables

Airlock manages its own `.env.local` through the setup UI. The key variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing MCP auth tokens |

## Features

### For Admins / DevOps
- **One-time infrastructure setup** — connect Supabase and Vercel, configure once, done
- **Secrets vault** — securely store API keys (OpenAI, Stripe, etc.) that all projects can reference by name
- **Member management** — invite users, generate onboarding messages, track activity
- **Project oversight** — dashboard showing all deployed projects, their status, and deployment history
- **Security built-in** — Row Level Security policies, encrypted secrets, auto-injected auth on published apps

### For Team Members
- **Zero config deployment** — one-click setup, then just tell Claude "deploy this"
- **Personal project dashboard** — see all your published apps, their URLs, deployment history
- **MCP-powered** — works natively with Claude Code through the Model Context Protocol
- **Framework support** — deploy Next.js, Vite, or static sites

### MCP Tools

Airlock exposes these tools to AI coding agents via MCP:

| Tool | Description |
|------|-------------|
| `deploy` | Publish code to a new or existing Vercel project |
| `list_projects` | Browse existing projects with optional filters |
| `get_project` | Get full project details and source code for modification |
| `get_available_secrets` | List available API keys (names only, never values) |

## Architecture

Built with:

- **[Next.js](https://nextjs.org/) 16** — App Router, Server Components, Server Actions
- **[Supabase](https://supabase.com/)** — Authentication (Google + email/password) and PostgreSQL database
- **[Drizzle ORM](https://orm.drizzle.team/)** — Type-safe database access with migration support
- **[Vercel API](https://vercel.com/docs/rest-api)** — Deployment orchestration, project management, environment variables
- **[MCP (Model Context Protocol)](https://modelcontextprotocol.io/)** — Standard protocol for AI tool integration
- **[shadcn/ui](https://ui.shadcn.com/)** — Component library with Tailwind CSS
- **[Tailwind CSS](https://tailwindcss.com/) v4** — Styling

### Database Schema

Key tables: `tenants`, `users`, `projects`, `deployments`, `secrets`, `project_secrets`, `agents`, `usage_events` — all with multi-tenant isolation via `tenant_id` and Row Level Security.

### Security Model

- All published apps get auth middleware injected automatically
- API secrets are encrypted at rest
- MCP tokens are JWTs scoped to user + tenant
- Supabase RLS policies enforce tenant isolation at the database level

## Contributing

Contributions are welcome! This is an early-stage project and there's a lot to build.

Some areas where help is needed:

- **Additional cloud providers** — AWS, GCP, Cloudflare Pages support
- **More AI tool integrations** — beyond Claude Code
- **Usage analytics and billing** — per-project cost tracking
- **Custom domains** — for published apps
- **Template marketplace** — pre-built app templates

## License

MIT
