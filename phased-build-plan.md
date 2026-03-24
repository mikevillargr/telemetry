# Growth Rocket BI Platform — Phased Build Plan

## Phase 1 — Foundation
**Goal:** Running monorepo, auth, app shell, client and user management

- Monorepo setup (npm workspaces + Turborepo)
- Docker Compose (web, api, db, redis, nginx)
- PostgreSQL + pgvector schema (Prisma)
- JWT auth with role-based access control
- Login page + protected routes
- App shell — sidebar, topbar, client selector, date range picker
- Client CRUD (list, create, edit)
- User management (invite, role assignment)
- Audit log writes for sensitive actions

**Done when:** Admin can log in, create a client, invite a user, assign roles. App shell is navigable.

---

## Phase 2 — Data Connections
**Goal:** Pull live data from GA4, GSC, Meta Ads. Manual uploads working.

- Connector plugin architecture (standard interface: verify, pull, schedule)
- GA4 connector (OAuth service account)
- Google Search Console connector
- Meta Ads Marketing API connector (Insights API)
- Manual upload connector (CSV/Excel → parsed → stored)
- Connector credentials storage (AES-256 encrypted in DB)
- Client Settings > Connected Sources UI (toggle cards, connection status, last synced)
- Data pull UI with status indicators and progress feedback

**Done when:** For any client, an AM can connect GA4, GSC, and Meta, trigger a data pull, and see normalized data returned.

---

## Phase 3 — RAG Layer + Client Onboarding
**Goal:** Embedding pipeline running, client onboarding flow complete.

- pgvector embedding pipeline (chunk → embed → store with metadata)
- Embedding model integration (`text-embedding-3-small` via OpenAI or Claude)
- RAG retrieval utilities (semantic search scoped by client_id)
- Client onboarding flow:
  - Domain input
  - Baseline data pull trigger
  - History brief generation (pre-agent, simple summary)
  - RAG seed document creation (`content_type: onboarding_brief`)
- Manual enrichment fields (goals, nuance, blacklist, KPI definitions)
- Onboarding status indicator in Client Settings

**Done when:** Creating a new client triggers a baseline pull, generates and stores a history brief in RAG, and the brief is retrievable by client_id.

---

## Phase 4 — Agents + SSE Streaming
**Goal:** All 4 agents working, streaming to frontend via SSE.

- SSE streaming endpoint architecture (`/api/agents/:type/stream`)
- Agent orchestration layer (model config retrieval, RAG context injection, stream handler)
- Data Agent — pulls and normalizes data on demand, streams status
- Visualization Agent — receives data payload, instructs Claude to render HTML/SVG chart
- Strategy Agent — full RAG context injection, generates narrative + recommendations
- Trends Agent — on-demand mode (query-triggered), streams digest
- Agent model config table wired to Admin UI (per-agent model selector)
- Chat interface in frontend:
  - SSE streaming renderer (token accumulation + animated cursor)
  - Agent response blocks with agent type badge + model badge
  - Inline visualization panel (sandboxed iframe, HTML/SVG render)
  - Conversation history per client

**Done when:** In the Chat interface, a user can ask a plain-language question about a client, all 4 agents respond in sequence with streaming output, and visualizations render inline.

---

## Phase 5 — Visualization + Reports
**Goal:** Full report generation, PPTX export, visualization controls.

- Visualization type switcher (bar/line/pie/scatter/table)
- Copy-as-image on any chart block
- Report builder — assemble narrative + charts into a named report
- Reports saved to DB + RAG (`content_type: report`)
- Reports page — grid of report cards, open full report view
- PPTX export:
  - Redis queue job
  - pptxgenjs assembles slides: cover, metric cards, charts, narrative, recommendations
  - SSE progress updates during generation
  - Download link on completion
- Dashboard page wired to real data:
  - Stat cards with deltas
  - Traffic trend chart (Tremor)
  - Channel breakdown chart (Tremor)
  - AI narrative block (Strategy Agent output)

**Done when:** A full report can be generated for a client, viewed on-page, and exported to a downloadable PPTX with narrative and charts.

---

## Phase 6 — Trends Agent (Full)
**Goal:** Automated intelligence feed with scheduled digests.

- RSS ingestion pipeline (fetch, parse, dedup by URL hash)
- Source library: SEO, GEO/AI Visibility, Paid Media, Research (curated list)
- Brave Search API integration (on-demand signal queries)
- Trends feed UI — card list, category filter pills
- On-demand mode: user asks question in Trends chat panel
- Scheduled digests via Redis cron:
  - Daily brief (configurable time)
  - Weekly digest (Mondays)
  - Monthly summary (1st of month)
- Digest stored in RAG (`content_type: trends_digest`)
- Digest schedule controls in Admin Settings

**Done when:** The Trends feed populates automatically, digests run on schedule, and the Trends Agent can be queried on demand in the chat interface.

---

## Phase 7 — Semrush Integration
**Goal:** Keyword rankings and competitive intelligence live in platform.

- Semrush Standard API connector (Position Tracking + Analytics API)
- Semrush Trends API connector
- Keyword ranking views per client (table: keyword, position, volume, delta)
- Competitive intelligence block (top competitor domains, keyword gaps)
- Semrush data integrated into Strategy Agent RAG context
- AI Overview / SERP feature tracking (where Semrush API supports it)

**Done when:** For any client, the platform shows live keyword positions from Semrush and the Strategy Agent references ranking trends in its narrative.

---

## Phase 8 — Client Portal + API Layer
**Goal:** Clients can log in to a read-only portal. External apps can call the API.

- Client portal auth scope (separate JWT role: `client`)
- Portal UI — simplified read-only view (latest report, metric snapshot, trends summary)
- Portal branding (Growth Rocket footer, clean presentation-ready layout)
- Exposed REST API endpoints (documented):
  - `GET /api/v1/clients/:id/metrics`
  - `GET /api/v1/clients/:id/reports`
  - `POST /api/v1/agents/query`
  - `GET /api/v1/trends/digest`
- API key management (generate, revoke, scope by client)
- OpenClaw integration documentation + example requests

**Done when:** A client can log into their portal and see their latest data. An external app (OpenClaw) can call the API with a valid key and receive structured data.

---

## Phase 9 — Polish + Hardening
**Goal:** Production-ready. Secure, performant, observable.

- Audit log full UI (table with filters, export)
- Usage / billing dashboard — Claude API usage by agent, by client, by model
- Security review:
  - Credential encryption audit
  - Auth edge cases (token expiry, role escalation prevention)
  - SQL injection / input sanitization pass
  - Rate limiting on all public endpoints
- Performance:
  - DB query optimization (indexes on client_id, created_at, embedding)
  - Redis caching for frequent data pulls
  - Next.js bundle analysis + optimization
- Error monitoring setup (Sentry or similar)
- Load testing (k6 or similar)
- Nginx SSL + production hardening
- README + deployment documentation

**Done when:** Platform is deployable to production Hostinger VPS with confidence. All known security issues resolved. Monitoring in place.
