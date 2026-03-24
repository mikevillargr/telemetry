# MP-UI-DELTA.md — Magic Patterns UI Reconciliation
## Growth Rocket BI Platform

This document captures all UI patterns, page structures, component behaviors, and design decisions introduced by the Magic Patterns prototype (editor ID: `9fzgt1seg69frjmtftvsey`) that are **additive or different from what was specified in CLAUDE.md, initial-claude-code-prompt.md, and phased-build-plan.md**. Claude Code should treat this as a supplementary design spec to reconcile during implementation.

Do not modify CLAUDE.md, the initial prompt, or the phased build plan. This file extends them.

---

## Product Naming

- The platform is named **"Telemetry"** in the sidebar branding (not "Growth Rocket BI" — that is the internal project name only).
- The Rocket icon from `lucide-react` is used as the sidebar logo mark.
- The AI assistant layer is named **Sulu** (the modal/interface for querying agents). Sulu is the user-facing name for the multi-agent query interface.
- The product name "Telemetry" and the AI assistant name "Sulu" are separate concepts: Telemetry is the platform, Sulu is the AI interface within it.

---

## Navigation Structure

The sidebar nav has **6 items** (not 5 as implied by the original spec). The Chat page is a first-class nav item:

```
1. Data Stream       → /dashboard      (LayoutDashboard icon)
2. Reports           → /reports        (FileText icon)
3. Trends            → /trends         (TrendingUp icon)
4. Clients           → /clients        (Users icon)
5. Chat              → /chat           (MessageSquare icon)  ← ADD THIS
6. Settings          → /settings       (Settings icon, pinned to bottom)
```

The sidebar is collapsible to an icon rail. Active state is indicated by a left-border accent bar (`w-1 h-4 bg-primary rounded-r-full`) and `bg-primary/10` background. The user avatar/name is pinned to the sidebar bottom above Settings.

---

## Dashboard Page ("Data Stream")

The Dashboard is renamed **"Data Stream"** in the nav label and page heading.

### Top Bar (Sticky)
- Client selector dropdown (left): shows client logo initial + client name + ChevronDown
- Action buttons (right, in order): **Sulu** (primary filled, Sparkles icon), **Build Report** (outline), **Pull Latest Data** (outline), then a divider, then the **DateFilterBar** component

### Tab Bar
The Dashboard has two tabs rendered below the top bar:
1. **Data Stream** (default, LayoutDashboard icon) — shows the main metric/chart view
2. **Data Imports** — shows the `DataImportView` component (file upload + recent uploads table)

### Stat Cards
- 7 metric cards displayed in a responsive grid (`xl:grid-cols-7`)
- Cards: Impressions, Clicks, CTR, Avg Position, Sessions, Conversions, ROAS
- Each card has: label (uppercase, xs), large mono value, trend badge (up=green ArrowUpRight / down=red ArrowDownRight), sparkline area chart at bottom
- Cards are **removable**: hover reveals Copy, Download, and X (remove) icon buttons in the top-right corner
- Removed cards disappear from the grid (tracked in local state `hiddenCards`)

### Charts Section
- **Traffic & Conversions Trend**: `AreaChart` (recharts), dual Y-axis (sessions left, conversions right), sessions=`#3B82F6`, conversions=`#E8450A`. Hover reveals Copy/Download/Remove controls.
- **Channel Breakdown**: `PieChart` (donut), channels: Organic Search, Direct, Paid Search, Social. Colors: `['#3B82F6', '#E8450A', '#10B981', '#8B5CF6']`. Center shows total count.

### Data Trends Block (Strategy Agent)
Below the charts, a full-width card labeled **"Data Trends"** with a **"Strategy Agent"** badge. This is a pre-rendered narrative block (not live-streamed on the dashboard — that happens in the Chat interface). Contains:
- 2-paragraph narrative with inline `<span>` highlights (emerald for positive, amber for risk)
- **Key Observations**: 3 cards (Opportunity=emerald dot, Risk=amber dot, Emerging=blue dot) each with a headline and 2-line description
- **Recommended Focus This Period**: numbered action list with priority badges (Urgent=red, High=red, Medium=amber)
- Footer action row: "Refine Analysis" (outline button, Sparkles icon), "Export to Report" (ghost button, FileText icon)
- Hover on the block reveals Copy/Download/Remove controls in the header area

### Potential Correlations Block
Below Data Trends: a list of industry news/signal cards. Each card has:
- Source avatar (letter + color), category badge, timestamp, headline, 2-line description
- **"Correlate"** button (outline, Link2 icon) on the right
- Hover reveals Copy/Download/Remove icon buttons

### Data Import Tab (DataImportView)
Three-step flow:
1. **Upload step**: Drag-and-drop zone (click to simulate upload), recent uploads table (File Name, Source, Date, Records, Status badge, Review button)
2. **Summary step**: AI Import Summary card — 3 editable sections: "What I understood", "How it maps to client history", "RAG Storage Plan". Confirm & Process / Cancel buttons.
3. **Review step** (per existing upload): Data quality metrics (rows/errors/warnings), AI Import Summary (3 sections: what was imported, client data mapping, RAG storage), Column Schema table, AI fine-tune input bar with suggestion chips ("Remap columns", "Fix warnings", "Change chunking"), Delete and Re-process buttons.

---

## Sulu Modal (AIInsightsModal)

Triggered by the Sulu button in the Dashboard top bar. This is the primary single-query AI interface (complementary to the full Chat page).

- Full-screen modal with backdrop blur
- Header: Sparkles icon + "Sulu" label + client name badge (e.g. "Acme Corp") + X close button
- **Main response area** (scrollable):
  - Large headline stat with inline client badge (e.g. "Organic sessions are up 72% over the past 9 months for [Acme Corp]")
  - Subheading line (e.g. "Strongest growth in Sep–Nov, driven by blog content.")
  - `AreaChart` (recharts) showing sessions and pageviews over time
  - Response action row: Copy, Download, Pin to Dashboard, Regenerate (all ghost buttons)
  - **Relevant Trends** section: 2 trend cards with category badge, headline, 2-line description, "Correlate" button
  - **Strategy Agent** block: green header band ("Strategy Agent" badge + "Agency Narrative" label), narrative paragraph, Recommended Actions numbered list with priority badges (High/Medium), "Refine Strategy" button
- **Bottom input bar** (sticky):
  - Paperclip (attach) icon button on left
  - Large rounded input ("Ask anything...")
  - Mic icon + Send button on right
  - Suggestion chips below: "Summarize data", "Analyze trends", "Find anomalies"

---

## Chat Page

Full-page layout with a conversation sidebar on the left and main chat area on the right.

### Conversation Sidebar (left, w-72)
- Header: "Conversations" label + Plus button (new conversation)
- List of per-client conversation threads: client name, preview label, timestamp
- Active thread highlighted with `bg-accent`

### Main Chat Area (right)
- **Header**: Client name + "Data Agent Active" status pill (green dot + text)
- **Message thread** (scrollable):
  - User messages: right-aligned, `bg-primary/10`, rounded bubble
  - Agent messages: left-aligned cards with a **2px colored left border** identifying the agent:
    - Data Agent: `border-l-primary` (orange)
    - Visualization Agent: `border-l-[#3B82F6]` (blue)
    - Strategy Agent: `border-l-emerald-500` (green)
  - Each agent message card has: agent type badge + model badge in the header (`claude-opus-4-6`, `claude-sonnet-4-6`, etc.), response content, footer action row (Copy, Regenerate, Save to Report)
  - Streaming state: pulsing green dot indicator on the Strategy Agent message while generating
  - Visualization Agent renders a placeholder for inline charts (`[Interactive Donut Chart Rendered Here]` in prototype — in production this will be the actual sandboxed chart iframe per Phase 4/5 spec)
- **Input bar** (sticky bottom):
  - Paperclip (attach) left, Input center, Mic + Send right
  - Rounded-full pill style (`h-12 rounded-full`)
  - Placeholder is client-contextual: "Ask about [Client Name]'s data..."

---

## Clients Page

- List view in a single `rounded-2xl` container (not individual cards)
- Columns: Client (avatar initial + name + industry badge), Team & Sources (AM name + sources connected count), Status + last sync timestamp, Actions (Manage button + overflow menu — hover-reveal)
- Client avatar: 2-letter initials, pink/rose color scheme
- Clicking any row navigates to `/clients/:id`
- "Add Client" button top-right (rounded-full, Plus icon)

---

## Client Detail Page

URL pattern: `/clients/:id`

Left sub-navigation (inside the page, not the main sidebar) with 5 tabs:

1. **Overview** — Data Health card, RAG Documents count card, Last Report card, Recent Activity feed
2. **Connected Sources** — grid of connector cards (GA4, GSC, Meta Ads, Semrush). Each card: connector name, status badge, toggle switch (visual only), last sync timestamp, Configure button. Plus a Manual Upload dashed card.
3. **Onboarding** — progress bar (0–100%), 4-step timeline: Domain & Basic Info → Baseline Data Pull → History Brief Generation → RAG Seed Creation. Steps show Done/In Progress states with appropriate badges.
4. **Configuration** (labeled "Manual Enrichment") — 3 text fields: Client Goals & KPIs (textarea), Strategic Nuance (textarea), Blacklist Terms (Input). Save Changes button top-right.
5. **Team** — table of assigned users (Name, email, Role badge, Remove button). "Assign User" button top-right.

Page header: back arrow to Clients, client avatar + name + industry badge + status badge, domain link (external), AM name. Action buttons: "Client Portal" (outline), "Sync All Data" (filled).

---

## Reports Page

- Filter bar below the page header: All Clients dropdown, DateFilterBar, then category pill badges (All, Performance, SEO, Paid Media, Strategy)
- Grid of report cards (`grid-cols-3`), each card:
  - Gradient header area with large FileText icon (color-tinted based on agent)
  - Agent type badge (top-right of card header): Data Agent=primary/blue, Strategy Agent=emerald, Trends Agent=purple
  - Report title, client name, date
  - "View Report" button (full-width ghost, reveals on hover)
- "New Report" button top-right (rounded-full, Plus icon)

---

## Trends Page ("Intelligence Feed")

Page heading is **"Intelligence Feed"** (not "Trends").

- Category filter pills: All (filled/active), SEO, GEO/AI Visibility, Paid Media, Research
- Feed of expandable trend cards:
  - Source avatar (letter + color), category badge, timestamp, headline, summary paragraph
  - **"Analyze Impact"** button expands the card inline
  - Expanded state shows: client selector dropdown, then an impact analysis block (narrative + 3 metric cards: At-Risk Traffic, Affected Pages, Revenue Impact), then actions: "Send to Strategy Agent", "Add to Report", "Dismiss"
- **Digest Delivery** section at bottom: Daily/Weekly/Monthly toggle + delivery time display

---

## Settings Page

Left sub-navigation with 5 tabs:

1. **Users** — table: Name, Email, Role badge (color-coded), Status toggle. "Invite User" button.
2. **Agent Configuration** — 4 cards (one per agent), each with `border-t-4` color accent, agent name, description, model selector dropdown, "Allow per-client overrides" toggle. Model options: Opus 4.6, Sonnet 4.6, Haiku 4.5.
3. **API Keys** — list of connector credentials: name + status dot, last used, masked key with show/hide toggle, Rotate button.
4. **Billing / Usage** — 3 summary cards (Total API Calls, Total Cost, Avg Cost/Query), BarChart of usage by agent (4 agents, color-coded matching their border accent), Export CSV button.
5. **Audit Log** — table: Timestamp, User, Action, Client, Details. Export Log button.

---

## Login Page

- Centered card on plain background
- Rocket icon in a circle above title
- Title: "Growth Rocket" (not "Telemetry" — login is brand-level)
- Email + Password fields, Remember Me checkbox
- "Sign In" primary button (full width)
- Divider + "Sign in with SSO" outline button

---

## Date Filter Bar Component

Located at `components/filters/DateFilterBar.tsx`. Composed of two sub-components:
- `DateRangePicker` — date range selector (defaults to Last 30 Days)
- `ComparisonPicker` — comparison mode selector (defaults to `previous_period`)

Both emit change events via props. The bar is used in the Dashboard top bar and the Reports filter bar.

---

## Design System Notes (MP-specific, extending CLAUDE.md)

The MP prototype uses a **light theme** with shadcn/ui CSS variable conventions, which differs from the dark theme (`#0A0A0F`) specified in CLAUDE.md. When building the production app:

- **Honor the dark theme from CLAUDE.md** as the primary theme.
- The MP component patterns (card structures, hover controls, agent badges, left-border color coding, etc.) should be ported into the dark theme palette.
- The orange accent `#E8450A` from CLAUDE.md maps to `primary` in the MP prototype — this is consistent.
- The green `#10B981` = emerald = Strategy Agent color.
- The blue `#3B82F6` = electric blue = Visualization Agent / Data charts color.
- The purple `#8B5CF6` = Trends Agent color.
- Agent color-coding is consistent across Chat, Settings, and Reports — use this as the canonical agent color map.

### Agent Color Map (canonical)
| Agent | Color | Hex |
|---|---|---|
| Data Agent | Orange (primary) | `#E8450A` |
| Visualization Agent | Electric Blue | `#3B82F6` |
| Strategy Agent | Emerald | `#10B981` |
| Trends Agent | Purple | `#8B5CF6` |

---

## Features Introduced in MP Not in Original Spec

These are net-new UI behaviors seen in the MP prototype that should be incorporated into the relevant build phase:

1. **Removable dashboard widgets** (stat cards, charts, narrative blocks) with hover-reveal Copy/Download/Remove controls — add to Phase 5.
2. **"Pin to Dashboard" action** in the Sulu modal response — saves an agent insight block to the dashboard — add to Phase 5.
3. **AI fine-tuning of data imports** — after upload, users can send plain-language instructions to adjust column mapping, chunking strategy, or fix warnings — add to Phase 3 (RAG Layer).
4. **"Correlate" button on trend cards** — links a trend signal to a specific client's data for impact analysis — add to Phase 6 (Trends Agent).
5. **"Analyze Impact" in-line expansion on Trends feed** — per-trend, per-client impact analysis block with quantified metrics — add to Phase 6.
6. **"Send to Strategy Agent" from Trends** — routes a trend signal as context into a Strategy Agent query — add to Phase 6.
7. **Per-client overrides toggle on agent config** — allows agent model to be overridden at the client level — add to Phase 4 (Agents).
8. **"Add to Report" action on chat messages** — saves individual agent response blocks into a report being assembled — add to Phase 5 (Reports).
9. **Digest Delivery controls** on Trends page (Daily/Weekly/Monthly + time) — add to Phase 6.
10. **"Build Report" button** in Dashboard top bar — shortcut to report builder — add to Phase 5.
11. **SSO login option** on the Login page — stub for now, wire up in Phase 9 if needed.
12. **Conversation sidebar** in Chat — per-client thread history — add to Phase 4.
13. **"Client Portal" button** on Client Detail page — direct link to the client's portal view — add to Phase 8.

---

## Implementation Priority Notes

- The MP prototype is a **visual reference only**. All mock data should be replaced with real API calls per the backend spec in CLAUDE.md.
- The Chat page's Visualization Agent placeholder (`[Interactive Donut Chart Rendered Here]`) maps to the sandboxed iframe renderer described in Phase 4.
- The DataImportView's 3-step flow (upload → AI summary → review) maps to the manual upload connector in Phase 2 with the RAG storage plan from Phase 3.
- The Onboarding tab in Client Detail maps directly to the 4-step onboarding flow in Phase 3.
- The Agent Configuration tab in Settings is the Admin UI referenced in Phase 4 for per-agent model configuration.
- The Billing/Usage tab in Settings is the usage/billing dashboard referenced in Phase 9.
- The Audit Log tab in Settings is the audit log UI referenced in Phase 9.
