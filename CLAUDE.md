# CLAUDE.md — Growth Rocket BI Platform

## Project Overview
Growth Rocket BI is a multi-tenant AI-powered business intelligence platform for a digital marketing agency. It enables Account Managers, Strategists, and Leadership to pull data from connected marketing sources, ask plain-language questions, visualize performance, and generate narrative reports and PPTX decks — all with AI agents powered by the Anthropic Claude API.

---

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui (component base)
- Tremor (dashboard/data components)
- SSE (Server-Sent Events) for streaming agent responses

### Backend
- Node.js
- REST API with SSE endpoints
- JWT authentication with role-based access control

### Database
- PostgreSQL with pgvector extension (RAG store + relational data)
- Redis (job queue, caching, cron scheduling)

### AI
- Anthropic Claude API (`@anthropic-ai/sdk`)
- Models: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001
- Per-agent model configuration stored in DB, configurable from Admin UI
- 4 agents: Data, Visualization, Strategy, Trends

### Infrastructure
- Docker Compose
- Nginx reverse proxy
- Hostinger VPS (Ubuntu)
- PM2 or Docker restart policies

### External APIs
- Google Analytics 4 (Data API v1)
- Google Search Console (Search Analytics API)
- Meta Ads (Marketing API / Insights API)
- Semrush (Standard API + Trends API)
- Brave Search API (Trends Agent web search)

### Export
- pptxgenjs (PPTX generation)

---

## Project Structure

```
/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/                      # App Router pages
│   │   │   ├── (auth)/               # Login, auth pages
│   │   │   ├── (app)/                # Authenticated app shell
│   │   │   │   ├── dashboard/        # Main dashboard
│   │   │   │   ├── chat/             # Chat interface
│   │   │   │   ├── reports/          # Reports page
│   │   │   │   ├── trends/           # Trends feed
│   │   │   │   ├── clients/          # Client config
│   │   │   │   └── settings/         # Admin/settings
│   │   │   └── portal/               # Client portal (separate scope)
│   │   ├── components/               # Shared UI components
│   │   │   ├── ui/                   # shadcn components
│   │   │   ├── charts/               # Tremor + custom chart wrappers
│   │   │   ├── agents/               # Agent response blocks, streaming
│   │   │   └── layout/               # Sidebar, topbar, shell
│   │   └── lib/                      # Frontend utilities, hooks, SSE client
│   │
│   └── api/                          # Node.js API
│       ├── routes/                   # REST route handlers
│       ├── agents/                   # Agent orchestration
│       │   ├── data-agent.ts
│       │   ├── viz-agent.ts
│       │   ├── strategy-agent.ts
│       │   └── trends-agent.ts
│       ├── connectors/               # External API connectors (plugin pattern)
│       │   ├── ga4.ts
│       │   ├── gsc.ts
│       │   ├── meta.ts
│       │   ├── semrush.ts
│       │   ├── brave.ts
│       │   └── upload.ts
│       ├── rag/                      # RAG layer (embed, store, retrieve)
│       ├── sse/                      # SSE stream helpers
│       ├── queue/                    # Redis job queue + cron
│       ├── export/                   # PPTX generation
│       └── lib/                      # Shared utilities, auth, DB client
│
├── packages/
│   └── shared/                       # Shared types, constants, schemas
│
├── docker-compose.yml
├── nginx.conf
└── CLAUDE.md
```

---

## Core Concepts

### Multi-tenancy
Every database query is scoped by `client_id`. No data ever crosses client boundaries. Users are assigned to clients. The `client_id` is always validated against the authenticated user's permissions before any query or agent call.

### RAG Store
All agent outputs, data pulls, reports, recommendations, and strategy documents are chunked, embedded, and stored in pgvector with the following metadata:
- `client_id` — always required
- `content_type` — `data_pull | report | recommendation | strategy | onboarding_brief | trends_digest`
- `created_at`
- `author_agent` — which agent produced it
- `date_range` — if applicable

Retrieval always filters by `client_id` first, then semantic similarity, then optional date range.

### Agent Architecture
Each agent is a scoped Claude API call. The system prompt, context injected, and RAG retrieval are all tailored per agent. Agents do not call each other directly — the API orchestration layer chains them as needed.

Agent invocation pattern:
```typescript
async function invokeAgent(agentType: AgentType, payload: AgentPayload, res: Response) {
  const config = await getAgentConfig(agentType) // model + system prompt from DB
  const context = await retrieveRAGContext(payload.clientId, agentType)
  const stream = await anthropic.messages.stream({
    model: config.model,
    system: config.systemPrompt,
    messages: buildMessages(payload, context),
    max_tokens: 4096,
  })
  for await (const chunk of stream) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)
  }
  res.end()
}
```

### SSE Streaming
Agent responses stream via SSE. The frontend connects to `/api/agents/:type/stream` and renders tokens as they arrive. Each SSE event is a JSON chunk. The frontend accumulates chunks and renders the full response on completion, storing it in RAG.

### Connector Plugin Pattern
All connectors implement the same interface:
```typescript
interface Connector {
  verify(clientId: string, credentials: ConnectorCredentials): Promise<boolean>
  pull(clientId: string, options: PullOptions): Promise<NormalizedData>
  schedule(clientId: string, cadence: Cadence): Promise<void>
}
```

### Agent Model Configuration
Agent model assignments are stored in the `agent_configs` table per org. Defaults:
- Data Agent: `claude-haiku-4-5-20251001`
- Visualization Agent: `claude-sonnet-4-6`
- Strategy Agent: `claude-sonnet-4-6`
- Trends Agent: `claude-sonnet-4-6`

Admin can change any agent to any available model from the Settings page. Changes apply immediately to the next invocation. All changes are written to the audit log.

---

## Database Schema (Key Tables)

```sql
-- Organizations (Growth Rocket = one org)
organizations (id, name, created_at)

-- Users
users (id, org_id, email, hashed_password, role, created_at)
-- role: admin | am | strategist | leadership | client

-- Clients
clients (id, org_id, name, domains[], industry, goals_text, nuance_text, blacklist[], created_at)

-- User <> Client assignments
user_clients (user_id, client_id)

-- Connector credentials (encrypted at rest)
connector_credentials (id, client_id, connector_type, credentials_encrypted, last_synced)

-- Agent configuration (per org)
agent_configs (id, org_id, agent_type, model, system_prompt, updated_at, updated_by)

-- Reports
reports (id, client_id, title, content_json, created_by_agent, created_at)

-- RAG store (pgvector)
rag_documents (id, client_id, content, embedding vector(1536), content_type, author_agent, date_range_start, date_range_end, metadata jsonb, created_at)

-- Audit log
audit_log (id, org_id, user_id, action, entity_type, entity_id, details jsonb, created_at)
```

---

## Auth & Roles

JWT-based auth. Token contains: `userId`, `orgId`, `role`, `assignedClientIds[]`.

| Role | Access |
|---|---|
| `admin` | Full access — all clients, all settings, user management |
| `leadership` | Read access to all clients, reports, trends. No settings |
| `am` | Full access to assigned clients only |
| `strategist` | Full access to assigned clients only |
| `client` | Portal only — read-only, own client data only |

---

## Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/grbi
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Connectors
SEMRUSH_API_KEY=
BRAVE_API_KEY=

# App
NEXT_PUBLIC_API_URL=
NODE_ENV=production
```

Client-specific connector credentials (GA4, GSC, Meta) are stored encrypted in the DB per client, not in env vars.

---

## Deployment Strategy

### Overview
Two-environment model: **local development** and **production VPS**. No staging environment initially. Code moves from local → GitHub → production VPS via GitHub Actions CI/CD.

---

### Local Development

All services run via Docker Compose locally.

```bash
# Start all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Run web app in dev mode (hot reload)
npm run dev --workspace=apps/web

# Run api in dev mode (ts-node-dev / nodemon)
npm run dev --workspace=apps/api

# Run DB migrations
npm run db:migrate --workspace=apps/api

# Seed database
npm run db:seed --workspace=apps/api
```

Local environment uses `.env.local` files in each app. These are never committed. `.env.example` files are committed and kept up to date as the canonical reference for all required variables.

**Local services:**
| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

### Repository Structure (GitHub)

- Repo: `github.com/mikevillargr/gr-bi-platform` (private)
- Default branch: `main` — always deployable, always passing
- Feature work: `feature/<name>` branches
- Merge to `main` via pull request
- Direct pushes to `main` are allowed during solo development but should move to PR-only once team is involved

Branch strategy:
```
main          ← production-ready, auto-deploys to VPS
feature/*     ← active development
fix/*         ← bug fixes
```

---

### GitHub Actions CI/CD

CI/CD pipeline lives in `.github/workflows/deploy.yml`. It triggers on every push to `main`.

**Pipeline steps:**
1. **Checkout** — pull latest code
2. **Lint + typecheck** — `npm run lint && npm run typecheck` across all workspaces
3. **Build** — `npm run build` for both `apps/web` and `apps/api`
4. **SSH into VPS** — using stored GitHub Secret credentials
5. **Pull latest code** on VPS — `git pull origin main`
6. **Run DB migrations** — `npm run db:migrate --workspace=apps/api`
7. **Rebuild Docker containers** — `docker compose up -d --build`
8. **Health check** — verify `/api/health` returns 200 before marking deploy successful

If any step fails, the pipeline stops and does not deploy.

```yaml
# .github/workflows/deploy.yml (scaffold — VPS credentials added later)
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint and typecheck
        run: npm run lint && npm run typecheck

      - name: Build
        run: npm run build

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/gr-bi-platform
            git pull origin main
            npm ci --production
            npm run db:migrate --workspace=apps/api
            docker compose up -d --build
            sleep 10
            curl -f http://localhost:3001/api/health || exit 1
```

**GitHub Secrets required (to be added when VPS is provisioned):**
- `VPS_HOST` — VPS IP address or domain
- `VPS_USER` — SSH username (e.g. `ubuntu` or `root`)
- `VPS_SSH_KEY` — private SSH key for VPS access

---

### Production VPS Setup (Hostinger)

To be completed when VPS credentials are provided. The following will be configured:

**Server setup checklist:**
- [ ] Ubuntu 22.04 LTS
- [ ] Docker + Docker Compose installed
- [ ] Node.js 20 installed
- [ ] Git installed, repo cloned to `/var/www/gr-bi-platform`
- [ ] `.env.production` file created on server (never in repo)
- [ ] Nginx installed and configured as reverse proxy
- [ ] SSL certificate via Let's Encrypt (Certbot)
- [ ] UFW firewall — allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS) only
- [ ] SSH key pair generated — public key added to server, private key added to GitHub Secrets
- [ ] Docker containers started: `docker compose up -d`
- [ ] DB migrations run: `npm run db:migrate --workspace=apps/api`
- [ ] DB seeded with initial org + admin user

**Production environment variables** live in `/var/www/gr-bi-platform/.env.production` on the server. This file is never committed to the repo. It mirrors `.env.example` with real values filled in.

---

### Rollback Strategy

If a bad deploy reaches production:

```bash
# SSH into VPS
ssh user@VPS_HOST

# View recent commits
cd /var/www/gr-bi-platform
git log --oneline -10

# Roll back to previous commit
git checkout <previous-commit-hash>
docker compose up -d --build
```

For DB migrations that cannot be rolled back automatically, Prisma migration history is used to identify and manually revert schema changes.

---

### Development Rules for Deployment

11. **Never commit `.env` files.** All environment files are in `.gitignore`. Use `.env.example` as the template.
12. **`main` is always deployable.** Do not push broken code to `main`. Test locally first.
13. **Migrations are one-way in production.** Write additive migrations — add columns, don't rename or drop without a deprecation window.
14. **VPS credentials live in GitHub Secrets only.** Never hardcode server IPs, usernames, or keys anywhere in the codebase.
15. **Health check endpoint is required.** `GET /api/health` must return `{ status: "ok" }` — this is used by the deploy pipeline to verify successful deployment.

---

## Key Development Rules

1. **Always scope by client_id.** No query, agent call, or RAG retrieval should ever run without a validated `client_id`.
2. **Never store raw credentials in plaintext.** All connector credentials are encrypted before DB insertion using AES-256.
3. **SSE streams must always close cleanly.** Handle client disconnects, agent errors, and timeouts — always call `res.end()`.
4. **RAG writes happen after agent completion.** Store the full agent response after streaming is done, not during.
5. **Agent configs are org-wide defaults.** Per-client overrides are additive, not replacements.
6. **Audit log every sensitive action.** Model changes, credential updates, user role changes, client deletions.
7. **Connector pulls are idempotent.** Re-pulling the same date range should not create duplicate RAG entries — use upsert with a content hash.
8. **No cross-agent direct calls.** Agents are orchestrated by the API layer, not by each other.
9. **PPTX export is async.** Long jobs go through Redis queue. Frontend polls or receives SSE progress update.
10. **Client portal is a hard auth boundary.** Portal JWTs have `role: client` and are validated separately. They cannot access any internal API routes.

---

## Build Phases

### Phase 1 — Foundation
- Monorepo setup, Docker Compose, DB schema, auth (JWT + roles)
- Basic Next.js shell with sidebar navigation
- Client CRUD, user management, role assignment

### Phase 2 — Data Connections
- Connector plugin architecture
- GA4, GSC, Meta Ads connectors
- Manual upload (CSV/Excel)
- Data pull UI + status indicators

### Phase 3 — RAG Layer
- pgvector setup, embedding pipeline
- Client onboarding flow (baseline pull → history brief → RAG seed)
- RAG retrieval utilities

### Phase 4 — Agents + SSE
- All 4 agents wired up
- SSE streaming endpoint + frontend streaming renderer
- Agent model config (DB + Admin UI)
- Chat interface

### Phase 5 — Visualization + Reports
- Claude visualization rendering in chat
- Tremor dashboard charts
- Report builder + save/view
- Copy-as-image, PPTX export

### Phase 6 — Trends Agent
- RSS ingestion pipeline
- Brave Search integration
- Scheduled digests (Redis cron)
- Trends feed UI

### Phase 7 — Semrush + Advanced SEO
- Semrush API connector
- Keyword ranking views
- Competitive intelligence blocks

### Phase 8 — Client Portal + API Layer
- Client portal auth scope + UI
- Exposed REST API endpoints
- OpenClaw integration documentation

### Phase 9 — Polish + Hardening
- Audit log UI
- Usage/billing dashboard
- Performance optimization
- Security review (credential encryption, auth edge cases)
- Load testing
