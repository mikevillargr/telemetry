# Initial Claude Code Prompt — Growth Rocket BI Platform

---

You are building **Growth Rocket BI**, a multi-tenant AI-powered business intelligence platform for a digital marketing agency. This is a production-grade web application. Read CLAUDE.md in full before writing any code.

## Your first task is to set up the complete project foundation (Phase 1).

### What to build in this session:

**1. Monorepo scaffold**
- npm workspaces with two apps: `apps/web` (Next.js 15) and `apps/api` (Node.js)
- One shared package: `packages/shared` for types, constants, and Zod schemas
- Root `package.json`, `turbo.json` (Turborepo), `.gitignore`, `.env.example`

**2. Docker Compose**
Create `docker-compose.yml` with the following services:
- `web` — Next.js app, port 3000
- `api` — Node.js API, port 3001
- `db` — PostgreSQL 16 with pgvector extension, port 5432
- `redis` — Redis 7, port 6379
- `nginx` — reverse proxy (routes `/api` to api service, `/` to web service)

Include a `docker-compose.dev.yml` override for local development with volume mounts.

**3. Database schema**
Write the full initial Prisma schema (`apps/api/prisma/schema.prisma`) covering all tables defined in CLAUDE.md:
- organizations, users, clients, user_clients
- connector_credentials, agent_configs, reports
- rag_documents (with pgvector `vector(1536)` column)
- audit_log

Include seed data: one org ("Growth Rocket"), one admin user (email from .env), default agent_configs for all 4 agents with `claude-sonnet-4-6`.

**4. Auth system**
In `apps/api`:
- JWT-based auth middleware
- `/auth/login` endpoint — email + password, returns JWT
- `/auth/me` endpoint — returns current user + role + assigned clients
- Password hashing with bcrypt
- Role validation middleware (admin | am | strategist | leadership | client)

In `apps/web`:
- Auth context provider
- Login page (use the MagicPatterns design — dark theme, centered card, Growth Rocket branding)
- Protected route wrapper
- JWT stored in httpOnly cookie

**5. App shell**
In `apps/web`, build the authenticated app shell:
- Left sidebar with navigation (Dashboard, Chat, Reports, Trends, Clients, Settings)
- Sidebar collapses to icon rail
- Top bar with client selector dropdown + date range picker
- Role-based nav item visibility (admin sees Settings, client sees portal only)
- Dark theme throughout — use the palette from CLAUDE.md

**6. Client CRUD**
- `GET /clients` — list all clients (scoped to user's assigned clients)
- `POST /clients` — create client (admin only)
- `GET /clients/:id` — get client detail
- `PATCH /clients/:id` — update client config
- Clients page in the web app: list view + create client form

**7. User management (Admin only)**
- `GET /users` — list users
- `POST /users/invite` — create user with role assignment
- `PATCH /users/:id/role` — change role
- Settings > Users page: table with invite button, role badges

---

## Technical requirements

- TypeScript throughout — strict mode
- Zod for all API input validation
- All DB queries scoped by `client_id` where applicable — never skip this
- Connector credentials fields in DB must be encrypted (use `crypto` AES-256-GCM, key from env)
- All sensitive admin actions (role changes, user creation) must write to `audit_log`
- Error handling: all API routes return consistent `{ success, data, error }` envelope
- Use Prisma as the ORM
- Use `@anthropic-ai/sdk` package — install it now even though agents come in Phase 4

---

## Design system

The web app uses:
- Tailwind CSS
- shadcn/ui (initialize with `npx shadcn@latest init`)
- Tremor for data components
- Dark background `#0A0A0F`, surface cards `#111118`, borders `#1E1E2E`
- Accent orange `#E8450A`, electric blue `#3B82F6`
- DM Sans for UI text, JetBrains Mono for data values
- All spacing on 8px grid

---

## When you are done with Phase 1:

Tell me:
1. What is running and what I need to do to start it locally
2. Any environment variables I need to set
3. What the default admin login credentials are
4. What is deliberately deferred to Phase 2

Do not move to Phase 2 until I confirm Phase 1 is working.
