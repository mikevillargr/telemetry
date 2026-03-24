# Growth Rocket BI Platform — MagicPatterns UI Description

## Product Overview
A multi-tenant AI-powered business intelligence platform for a digital marketing agency. Users include Account Managers, Strategists, Leadership, and Admins. Each user works across multiple clients. There is also a separate read-only Client Portal for external client access.

---

## Aesthetic Direction
**Refined dark-mode data tool.** Think Linear meets a Bloomberg terminal — dense, information-rich, but clean and intentional. Not flashy. Not corporate. Fast-feeling and precise.

- **Color palette:** Deep near-black background (`#0A0A0F`), dark surface cards (`#111118`), subtle borders (`#1E1E2E`), primary accent orange (`#E8450A`), secondary accent electric blue (`#3B82F6`), muted text (`#6B7280`), primary text (`#F1F5F9`)
- **Typography:** Sharp, geometric sans-serif for headings (e.g. DM Sans or Geist). Monospace for data values and metrics (e.g. JetBrains Mono or IBM Plex Mono). Clean body text for narrative blocks
- **Layout:** Left sidebar navigation, main content area, optional right context panel. Dense but breathable. 8px grid system
- **Components:** shadcn/ui base, Tremor for data components, Tailwind utility classes throughout
- **Motion:** Subtle — fade-ins on page load, smooth sidebar transitions, skeleton loaders on data fetch, SSE streaming text animation for agent responses

---

## Pages & Views

### 1. Login / Auth
- Minimal centered card on dark background
- Growth Rocket logo top center
- Email + password fields
- SSO option if applicable
- No distractions

### 2. Dashboard (Home)
- Top bar: client selector dropdown (search-enabled), date range picker, period comparison toggle
- Metric stat cards row: Impressions, Clicks, CTR, Avg Position, Sessions, Conversions, ROAS — each with WoW/MoM delta badge (green up / red down)
- Below: 2-column grid — Traffic trend line chart (left), Channel breakdown donut (right)
- Narrative block below charts: AI-generated key highlights, rendered as styled text with a subtle left orange border accent
- Quick actions: "Ask a question", "Generate report", "Pull latest data"

### 3. Chat Interface (per client)
- Full-height chat panel, client name in header
- Message bubbles: user right-aligned (accent bg), agent responses left-aligned (dark card)
- Agent responses stream in via SSE — typing indicator while generating
- Agent badge on each response: Data / Visualization / Strategy / Trends — small colored pill
- Inline visualizations render directly in the chat thread (HTML/SVG)
- Input bar at bottom: text field + send button + voice input icon + attach file icon
- Sidebar shows conversation history for this client

### 4. Reports Page
- Report cards grid — each card shows: title, client, date, agent that generated it, thumbnail preview
- Click to open full report: narrative sections, embedded charts, key highlights
- Per-chart actions: copy as image, change visualization type (dropdown), regenerate
- Export button top right: "Export to PPTX"
- Filter bar: by client, date range, report type

### 5. Client Configuration
- Client profile header: logo upload, domain(s), industry, assigned AM
- Tabs: Goals & KPIs | Metric Definitions | Nuance & Context | Blacklist | Connected Sources | Client Portal
- Goals tab: free-text goal entry + structured KPI fields (target CPC, target ROAS, etc.)
- Connected Sources tab: toggle cards for GA4, GSC, Meta Ads, Semrush — each shows connection status, last synced, credentials input
- Onboarding status bar: shows baseline pull progress and RAG seed status

### 6. Trends Feed
- Header: "Intelligence Feed" with filter pills — All | SEO | GEO/AI Visibility | Paid Media | Research
- Card list: each card shows source logo, headline, summary (2-3 lines), category tag, published date
- Right panel: "Ask about trends" — mini chat scoped to Trends Agent
- Digest controls: schedule toggles for Daily / Weekly / Monthly, delivery time picker

### 7. Admin / Settings
**Sections (left sub-nav):**
- **Users** — table of users, invite button, role badges, active/inactive toggle
- **Agent Configuration** — 4 agent cards (Data, Visualization, Strategy, Trends), each with model selector dropdown (Opus 4.6 / Sonnet 4.6 / Haiku 4.5), per-client override toggle
- **API Keys** — manage external API credentials (Semrush, Meta, GA4 service accounts), show/hide toggle, last used timestamp
- **Billing / Usage** — Claude API usage by agent, by client, by model — bar chart breakdown
- **Audit Log** — table: timestamp, user, action, client, details

### 8. Client Portal (separate auth scope)
- Simplified read-only view
- Shows: latest report, key metrics snapshot, trends summary
- No chat, no configuration access
- Clean, slightly lighter theme — appropriate for client-facing presentation
- Growth Rocket branding in footer

---

## Key Components

### Stat Card
- Dark card, subtle border
- Metric label (muted, small caps)
- Large monospace value
- Delta badge: arrow icon + percentage, green/red
- Sparkline mini chart below value

### Agent Response Block
- Left border accent colored by agent type (orange=Data, blue=Viz, green=Strategy, purple=Trends)
- Agent name + model badge top left
- Streaming text content
- Inline visualization panel if applicable
- Action row: copy | regenerate | save to report

### Visualization Panel
- Rendered HTML/SVG in sandboxed panel
- Top right controls: chart type switcher (bar/line/pie/scatter), fullscreen, copy as image
- Subtle dark background, respects overall palette

### Notification / Toast
- Bottom right
- Success (green), Error (red), Info (blue), Warning (amber)
- Auto-dismiss with progress bar

### SSE Streaming Indicator
- Animated blinking cursor at end of streaming text
- Subtle "Generating..." label with pulsing dot in agent badge

---

## Navigation Structure
```
Sidebar (collapsed icon-only or expanded with labels):
├── Dashboard
├── Chat
├── Reports
├── Trends
├── Clients
│   ├── [Client List]
│   └── + Add Client
├── Settings
│   ├── Users
│   ├── Agent Config
│   ├── API Keys
│   ├── Usage
│   └── Audit Log
└── [User Avatar + Role badge bottom]
```

---

## Responsive Behavior
- Desktop-first (this is an internal tool, primarily desktop use)
- Sidebar collapses to icon rail on smaller screens
- Dashboard cards stack to single column below 1024px
- Client Portal is responsive down to tablet

---

## Empty States
- No clients yet: illustration + "Add your first client" CTA
- No data pulled yet: "Connect a data source to get started"
- No reports: "Generate your first report from the Chat"
- All states should feel intentional, not like errors
