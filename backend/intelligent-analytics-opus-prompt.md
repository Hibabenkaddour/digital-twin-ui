# Intelligent Analytics Platform — Full Build Prompt

> **Copy everything below this line and paste it into your Opus 4.6 conversation.**

---

## Role & Context

You are the lead architect and full-stack engineer for **"Intelligent Analytics"** — a multi-tenant, real-time analytics platform. The platform allows a project manager (admin/builder) to connect to any client's live data, build interactive dashboards with charts, KPIs, a natural language query (NLQ) chatbot, and an interactive 3D floor/site plan — then **publish** the final result as a live, interactive web application that end-users (viewers) can access via a URL, embed, or white-labeled domain.

The current prototype uses:
- React frontend (dashboard + 3D plan + NLQ chat)
- PostgreSQL database with simulated data
- Docker for containerization
- WebSocket that pushes data every 2 seconds
- An LLM-powered NLQ (Natural Language Query) interface for asking questions about data
- A 3D interactive plan/visualization

The goal is to evolve this into a **production-grade, multi-tenant SaaS platform**.

---

## PART 1: Professional Data Connection Layer

### 1.1 — Connection Wizard (Frontend)

Build a step-by-step data source connection wizard UI with 3 steps:

**Step 1 — Choose Source Type**
Display cards for each connector type:
- **Databases**: PostgreSQL, MySQL, MongoDB, Microsoft SQL Server, ClickHouse
- **APIs**: REST API (custom endpoint), GraphQL
- **SaaS Connectors**: Salesforce, Google Analytics, Stripe, Shopify, HubSpot
- **File Upload**: CSV, Excel (.xlsx), JSON
- **Real-time Streams**: Kafka, MQTT, Webhook receiver

Each card should have an icon, name, and a "Popular" or "Real-time" badge where relevant.

**Step 2 — Configure Connection**
Dynamic form based on the selected source:
- For databases: Host, Port, Database name, Username, Password (masked), SSL toggle, optional SSH tunnel config
- For REST API: Base URL, Auth type (API Key / Bearer Token / OAuth2), Headers, Polling interval
- For file upload: Drag & drop area with schema auto-detection preview
- For Kafka: Bootstrap servers, Topic, Consumer group, Auth (SASL/PLAIN, SSL)
- Include a **"Test Connection"** button that validates connectivity and shows a green checkmark or red error with details

**Step 3 — Schema Mapping & Preview**
- Auto-detect tables/collections/fields from the connected source
- Show a table preview (first 10 rows)
- Let the admin toggle which tables/fields to expose
- Let the admin add **business aliases** (e.g., `orders.total_amount` → "Revenue", `stores.zone_id` → "Region")
- Let the admin tag field types: Dimension, Measure, Timestamp, Geo, ID
- **Save as a "Data Source" entity** that can be used across dashboards

### 1.2 — END-TO-END DATA ARCHITECTURE (CRITICAL)

**This is the backbone of the entire platform. Every feature (dashboards, NLQ, 3D plan) depends on this architecture. It must be followed exactly.**

There are **TWO separate WebSocket connections** and **the client's database is NEVER exposed to the internet**:

```
┌──────────────┐   WSS #1    ┌──────────────────┐   WSS #2 (Tunnel)   ┌──────────────┐      ┌──────────┐
│   Viewer's   │◄──────────►│   YOUR PLATFORM   │◄───────────────────►│  Client's    │─────►│ Client's │
│   Browser    │  (Socket.io)│   (Cloud)         │  (Secure Outbound)  │  Agent       │      │ Database │
└──────────────┘             └──────────────────┘                      │  (Docker)    │      └──────────┘
                                                                       └──────────────┘
                                                                       Runs INSIDE the
                                                                       client's infra
```

**WSS #1 — Viewer ↔ Platform**: The viewer's browser connects to your platform via Socket.io. This is a standard WebSocket. The browser NEVER talks to the client's database directly.

**WSS #2 — Platform ↔ Agent (Secure Tunnel)**: The agent runs inside the client's infrastructure (as a Docker container). It connects OUTBOUND to your platform — the client opens no inbound ports, exposes no database. Your platform sends query requests DOWN this tunnel; the agent executes them locally and sends results BACK up.

#### 1.2.1 — The Tunnel Agent (runs in client's infra)

A lightweight Docker container the client runs:

```
# Client runs this in their infrastructure:
docker run -e TENANT_ID=acme-corp -e PLATFORM_URL=wss://tunnel.yourplatform.com intelligent-analytics-agent
```

**The agent does TWO jobs:**

**Job 1 — Query Execution (request/response):**
- Platform sends a query request down the tunnel (e.g., SQL query from NLQ or dashboard widget)
- Agent executes the query against the local database
- Agent sends the result back up the tunnel
- This is the path for: NLQ queries, dashboard widget initial loads, drill-down requests, on-demand data fetches

**Job 2 — Real-Time CDC Push (continuous):**
- Agent runs Change Data Capture LOCALLY (PostgreSQL logical replication / MySQL binlog / MongoDB change streams)
- When data changes in the client's DB, the agent pushes ONLY the delta (changed rows) UP through the tunnel to your platform
- This is the path for: live-updating dashboards, 3D plan real-time overlays, alert triggers

**Agent specifications:**
- Connects outbound via persistent WebSocket/TLS tunnel (client opens NO inbound ports)
- Supports: PostgreSQL, MySQL, MongoDB, MSSQL
- Handles connection pooling to the local database
- Sends heartbeats every 10s; auto-reconnects with exponential backoff on failure
- All data in transit is encrypted (WSS/TLS)
- Agent has read-only database access (enforced at the DB user level)

#### 1.2.2 — Platform Tunnel Server (runs in your cloud)

**Receives and routes data from agents:**

- **Tunnel Registry**: maps `tenant_id` → active agent WebSocket connection
- **Query Router**: when a dashboard widget or NLQ needs data → finds the tenant's tunnel → sends query down → waits for response → returns to requester
- **CDC Ingestion**: receives real-time deltas from agents → writes them into Redis Streams (tenant-scoped channels)
- **Health Monitor**: tracks per-tenant: connection status, latency, last heartbeat, data freshness

#### 1.2.3 — Real-Time Data Flow (upgrade from current 2s polling)

The full real-time path, respecting the tunnel architecture:

```
Client's DB
     │
     │ (CDC: logical replication / binlog / change streams)
     ▼
Client's Agent (inside client's infra)
     │
     │ (WSS #2: Secure Tunnel — pushes deltas OUTBOUND)
     ▼
Your Platform — Tunnel Server
     │
     │ (writes deltas into message broker)
     ▼
Redis Streams (tenant-scoped channels: tenant:{id}:stream:{table})
     │
     │ (platform WebSocket server subscribes to relevant streams)
     ▼
Your Platform — WebSocket Server (Socket.io)
     │
     │ (WSS #1: pushes updates to subscribed browsers)
     ▼
Viewer's Browser (React components update reactively)
```

**Implementation details:**
- Use **Redis Streams** as the message broker (or Kafka at scale)
- Each tenant has isolated stream channels: `tenant:{id}:stream:{source_table}`
- When a viewer opens a dashboard, their browser subscribes (via Socket.io) to the specific data channels their widgets need
- The platform WebSocket server reads from Redis Streams and fans out to subscribed browsers
- **Delta updates only** — never resend the full dataset, only changed/new/deleted rows
- Frontend components subscribe to specific channels and update reactively (merge deltas into local state)
- Each widget shows a **"Live · Updated 2s ago"** indicator
- If the tunnel disconnects, widgets show a yellow "Stale data" warning with the last-updated timestamp

#### 1.2.4 — NLQ Query Flow (through the tunnel)

When a viewer asks a question in the NLQ chat, this is the FULL round-trip:

```
1. Viewer types: "What was revenue in Zone B last week?"
           │
           ▼  (WSS #1: browser → platform)
2. Platform NLQ Service receives the question
           │
           ▼
3. LLM (Claude API) generates a SQL query using:
   - Schema context (set by admin in Builder Mode)
   - Business glossary ("revenue" = SUM(orders.total))
   - Safety rules (read-only, allowed tables only)
           │
           ▼
4. SQL Validator checks the generated query:
   - Is it SELECT only? (block INSERT/UPDATE/DELETE/DROP)
   - Does it only touch allowed tables/columns?
   - Is there a LIMIT clause? (inject one if missing, max 1000 rows)
   - Does it timeout? (5s max)
           │
           ▼  (WSS #2: platform → agent, THROUGH THE TUNNEL)
5. Query is sent to the client's Agent via the secure tunnel
           │
           ▼
6. Agent executes the query against the client's local database
           │
           ▼  (WSS #2: agent → platform, result comes BACK through tunnel)
7. Result rows are sent back to the platform
           │
           ▼
8. LLM (Claude API) generates:
   - A natural language summary of the results
   - A recommended visualization type (bar chart, line chart, KPI card, table)
           │
           ▼  (WSS #1: platform → browser)
9. Browser renders: text answer + auto-generated chart
```

**At NO point does the viewer's browser talk to the client's database.** Everything is mediated by your platform, through the tunnel.

### 1.4 — Data Source Abstraction Layer (Backend)

Build a unified query interface so the rest of the platform doesn't care what the underlying source is:

```typescript
interface DataSource {
  id: string;
  tenantId: string;
  type: 'postgresql' | 'mysql' | 'mongodb' | 'rest_api' | 'csv' | 'kafka';
  connectionConfig: EncryptedJSON;
  schema: SchemaDefinition;
  businessGlossary: Record<string, string>; // "Revenue" → "SUM(orders.total)"
  status: 'connected' | 'degraded' | 'disconnected';
}

interface QueryEngine {
  execute(dataSourceId: string, query: UnifiedQuery): Promise<QueryResult>;
  subscribe(dataSourceId: string, channel: string): Observable<DataDelta>;
  testConnection(config: ConnectionConfig): Promise<ConnectionTestResult>;
}
```

All connection credentials must be encrypted at rest (AES-256) and never logged.

---

## PART 2: Builder Mode (Project Manager Interface)

### 2.1 — Dashboard Builder

A drag-and-drop dashboard builder where the admin can:

- **Add widgets** from a palette: Line chart, Bar chart, Pie chart, KPI card, Table, Gauge, Heatmap, Map, NLQ Chat panel, 3D Plan panel
- **Resize and arrange** widgets on a responsive grid (like Grafana/Superset)
- **Configure each widget**:
  - Select data source
  - Choose fields (dimensions, measures)
  - Set aggregation (SUM, AVG, COUNT, MIN, MAX)
  - Set filters, date range, grouping
  - Set refresh interval (real-time, 5s, 30s, 1m, 5m, manual)
  - Set conditional formatting / alert thresholds (e.g., red if value > X)
- **Theming panel**: Upload logo, pick brand colors, choose font, light/dark mode
- **Layout presets**: Start from templates (Executive Overview, Operations Monitor, Sales Dashboard)

### 2.2 — NLQ Configuration (Builder Side)

In Builder Mode, the admin configures what the NLQ chatbot knows:

- **Schema context**: Select which tables/fields the NLQ can query (restrict scope)
- **Business glossary**: Define terms ("churn rate" = formula, "MRR" = definition)
- **Suggested questions**: Pre-populate 5-10 example questions viewers can click
- **Safety rules**:
  - Read-only enforcement (SELECT only)
  - Blocked tables/columns (e.g., never expose `users.password_hash`)
  - Max row limit per query (default: 1000)
  - Query timeout (default: 5 seconds)
  - Rate limit per viewer (default: 20 queries/minute)
- **Visualization preferences**: Default chart type for different query shapes (single number → KPI card, time series → line chart, categories → bar chart)

### 2.3 — 3D Plan Configuration (Builder Side)

- **Upload 3D model** (glTF/GLB format) or build from a 2D floor plan
- **Define interactive zones**: Draw/select zones on the 3D model, name them, link each zone to a data source/field
- **Data binding per zone**:
  - Color mapping: field value → color scale (green/yellow/red)
  - Label overlay: show a live metric value floating above the zone
  - Click action: what data/chart shows when a viewer clicks a zone
- **Camera presets**: Save named viewpoints (Overview, Floor 1, Zone B Close-up)
- **Alert animations**: Define conditions that trigger visual alerts on zones (pulsing red, icon overlay)

---

## PART 3: Publish System — Live Interactive Export

### 3.1 — Publish Flow

When the admin clicks **"Publish"**, the system:

1. **Freezes the dashboard configuration** as a versioned JSON document:
```json
{
  "version": "2.1.0",
  "tenantId": "acme-corp",
  "publishedAt": "2026-04-22T10:00:00Z",
  "publishedBy": "admin@acme.com",
  "layout": { /* grid positions, widget configs */ },
  "dataSources": ["ds_001", "ds_002"],
  "nlqConfig": { /* schema context, glossary, safety rules */ },
  "threeDConfig": { /* model ref, zones, bindings */ },
  "theme": { /* logo, colors, fonts */ },
  "accessControl": { /* who can view, auth method */ }
}
```

2. **Generates access endpoints**:
   - Hosted: `https://acme.yourplatform.com/analytics`
   - Embed code: `<iframe src="https://embed.yourplatform.com/d/abc123" />`
   - API endpoint: `https://api.yourplatform.com/v1/tenants/acme/dashboard`

3. **Sets up authentication** for viewers:
   - Option A: Email invite (magic link, no password)
   - Option B: SSO integration (SAML/OIDC with client's identity provider)
   - Option C: Shared password (simple, for small teams)
   - Option D: Public (no auth, view-only, optional IP allowlist)

4. **Provisions real-time channels** for this published instance:
   - Creates tenant-scoped Redis Stream channels (`tenant:{id}:stream:{table}`)
   - Registers which data channels each widget subscribes to
   - Verifies the client's tunnel agent is connected and CDC is flowing
   - Sets up Socket.io rooms for this dashboard's viewers

### 3.2 — Published Viewer App (What End-Users See)

The published app is a **full React SPA** that includes:

**Interactive Dashboard**
- All charts render with live data following the real-time flow from section 1.2.3: Client DB → Agent CDC → (WSS #2 tunnel) → Platform → Redis Streams → (WSS #1 Socket.io) → Browser
- Users can: filter by date range, click to drill down, hover for tooltips, toggle metrics
- Responsive: works on desktop, tablet, mobile
- "Live · Updated 2s ago" indicator per widget; yellow "Stale data" warning if tunnel disconnects
- NO editing controls — layout is locked

**NLQ Chat Panel**
- Floating chat button (bottom-right) or side panel
- User types a question in natural language
- **The full query flow follows section 1.2.4 exactly**: Browser →(WSS #1)→ Platform → LLM generates SQL → SQL validated → query sent →(WSS #2 tunnel)→ Agent → Agent queries local DB → result returns →(WSS #2)→ Platform → LLM summarizes → answer sent →(WSS #1)→ Browser renders text + chart
- The viewer's browser NEVER contacts the client's database directly
- Conversation history within session
- "Suggested questions" pills at the top
- Export answer as PNG or CSV

**3D Interactive Plan**
- Full Three.js / React Three Fiber scene
- Live data overlays update in real-time via the same CDC → tunnel → Redis Streams → Socket.io pipeline (section 1.2.3)
- Viewer can: orbit, zoom, pan, click zones for detail panels
- Toggle layers: temperature, occupancy, alerts, status
- Click a zone → contextual dashboard panel slides in with that zone's data (data fetched through the tunnel per section 1.2.4)
- Integration with NLQ: "What happened in Zone B yesterday?" auto-scopes to that zone's data (query goes through the tunnel)

### 3.3 — Version Management

- Admin can publish multiple versions; viewers always see the latest
- Rollback to previous version with one click
- "Draft" vs "Published" states — changes in builder don't affect live viewers until republished
- Changelog: what changed between versions

---

## PART 4: Multi-Tenancy & Security

### 4.1 — Tenant Isolation

- Every tenant's data, configs, and streams are fully isolated
- Database: Row-level security (RLS) with `tenant_id` on every table, OR schema-per-tenant
- Redis/Kafka: Tenant-prefixed channels
- API: JWT tokens with `tenant_id` claim, validated on every request
- File storage: Tenant-scoped S3 prefixes for 3D models, logos, exports

### 4.2 — Role-Based Access Control

```
Super Admin (you)
  └── Tenant Admin (client's project manager)
        └── Builder (can edit dashboards)
              └── Viewer (can only view + interact with published dashboards)
```

Permissions matrix:
| Action | Super Admin | Tenant Admin | Builder | Viewer |
|--------|:-----------:|:------------:|:-------:|:------:|
| Manage data sources | ✅ | ✅ | ❌ | ❌ |
| Edit dashboards | ✅ | ✅ | ✅ | ❌ |
| Publish | ✅ | ✅ | ❌ | ❌ |
| View published | ✅ | ✅ | ✅ | ✅ |
| Use NLQ | ✅ | ✅ | ✅ | ✅ |
| Interact with 3D | ✅ | ✅ | ✅ | ✅ |
| Manage users | ✅ | ✅ | ❌ | ❌ |

### 4.3 — Audit & Compliance

- Log every: login, query, data access, config change, publish event
- Queryable audit trail per tenant
- Data residency options: let tenant choose region (EU, US, etc.)
- GDPR: data deletion endpoint per tenant

---

## PART 5: Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| State management | Zustand or Redux Toolkit |
| Charts | Recharts or Apache ECharts |
| 3D rendering | React Three Fiber (R3F) + drei helpers |
| Real-time (browser) | Socket.io client |
| Drag & drop builder | react-grid-layout or dnd-kit |
| Backend | Node.js (Express or Fastify) + TypeScript |
| Real-time (server) | Socket.io server + Redis Pub/Sub |
| Database (platform) | PostgreSQL (platform metadata, tenant configs, audit logs) |
| Message broker | Redis Streams (or Kafka at scale) |
| Tunnel agent | Node.js or Go, distributed as Docker image |
| CDC | Debezium (PostgreSQL, MySQL) or custom change stream listeners (MongoDB) |
| LLM / NLQ | Claude API (claude-sonnet-4-20250514) for SQL generation + answer summarization |
| SQL validation | sqlparse (Python) or node-sql-parser (JS) for safety checking |
| Auth | Keycloak (self-hosted) or Auth0 (managed) |
| Object storage | S3/MinIO for 3D models, logos, exports |
| Containerization | Docker + Docker Compose (dev), Kubernetes (production) |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana (for platform health) |

---

## PART 6: Implementation Order

Build in this sequence. Each phase should be a working increment:

### Phase 1 — Data Connection Foundation (Weeks 1-3)
1. Build the Connection Wizard UI (3-step form)
2. Implement PostgreSQL and CSV connectors (start with what you know)
3. Build the schema auto-detection and mapping UI
4. Build the Data Source Abstraction Layer
5. Replace current 2s polling with Redis Streams + WebSocket delta updates
6. Add connection health monitoring

### Phase 2 — Builder Mode (Weeks 4-6)
7. Build the drag-and-drop dashboard builder (grid layout + widget palette)
8. Implement widget configuration panels (data binding, filters, refresh rates)
9. Build the theming system (logo, colors, fonts)
10. Build the NLQ configuration panel (schema context, glossary, safety rules)
11. Build the 3D plan configuration panel (zone definition, data binding)

### Phase 3 — Publish System (Weeks 7-9)
12. Build the Publish flow (config freeze, URL generation, access setup)
13. Build the Viewer app shell (locked layout, real-time data, responsive)
14. Implement viewer authentication (magic link + SSO)
15. Build the NLQ chat panel for viewers (with all safety layers)
16. Build the 3D viewer with live data overlays
17. Build embed/iframe support

### Phase 4 — Production Hardening (Weeks 10-12)
18. Build the secure tunnel agent (Docker image)
19. Implement multi-tenancy isolation (RLS, scoped channels, JWT validation)
20. Build RBAC system
21. Build audit logging
22. Add MySQL, MongoDB, REST API connectors
23. Performance testing and optimization

---

## Instructions for Implementation


- Write clean, production-grade TypeScript with full type safety
- Every API endpoint must validate input (use Zod schemas)
- Every database query must be parameterized (no string concatenation)
- All secrets/credentials must be encrypted at rest
- Include error handling with meaningful error messages
- Write code that is modular and well-documented
- Each component should be in its own file with clear imports
- Use environment variables for all configuration
- Include Docker Compose for local development setup
- Make the UI polished and professional — this is a product, not a prototype

Start with **Phase 1** and build the Connection Wizard UI + PostgreSQL connector + schema mapping. Show me the full file structure and working code.
