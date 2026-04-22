# DXC Intelligent Analytics

> **Real-time 3D Digital Twin Platform with AI-powered analytics**
>
> Build, monitor, and share interactive digital twins of factories, airports, and warehouses — with live data streaming, NLQ AI chat, and shareable published dashboards.

![Platform](https://img.shields.io/badge/Platform-Web-blue) ![Stack](https://img.shields.io/badge/Stack-React%20%2B%20FastAPI-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🏗️ Visual Builder** | Drag-and-drop layout editor with real-time 3D preview. Configure grid dimensions, place components, and see them rendered instantly in a Three.js 3D scene. |
| **🔌 Multi-Source Data** | Connect to PostgreSQL databases or upload CSV/Excel files. The platform auto-discovers schemas and maps columns to KPI metrics. |
| **📊 Live KPI Monitoring** | Real-time WebSocket streaming of KPI values with color-coded status (green/orange/red), sparkline history charts, and threshold alerts. |
| **🦙 NLQ AI Chat** | Natural language queries powered by Groq (Llama 3.3 70B). Ask questions like *"Show temperature trends"* and get instant charts generated from live data. |
| **🚀 Publish & Share** | Freeze your dashboard configuration and publish it as a shareable link. Anyone with the URL sees a live, read-only dashboard with real-time data, charts, NLQ, and 3D twin. |
| **🌐 Cloud Deployment** | Production-ready Docker Compose with Nginx reverse proxy and Cloudflare Tunnel for free public URLs. `restart: always` on all services. |

---

## 🏛️ Architecture

```
┌───────────────────────────────────────────────────────┐
│                     Frontend                           │
│  React 19 + Vite + React Router                       │
│  ├── HomePage          (landing + published list)     │
│  ├── FormStep          (configure twin metadata)      │
│  ├── GridStep          (2D layout editor)             │
│  ├── ConnectionsStep   (wire components together)     │
│  ├── KpiStep           (assign KPIs to components)    │
│  ├── TwinView          (live 3D + KPIs + NLQ chat)   │
│  ├── DataSourceWizard  (connect DB / upload CSV)      │
│  └── PublishedView     (shareable read-only viewer)   │
├───────────────────────────────────────────────────────┤
│                     Backend                            │
│  FastAPI + Uvicorn                                    │
│  ├── /layout/*        (save/load twin layouts)        │
│  ├── /kpis/*          (KPI CRUD + history)            │
│  ├── /source/*        (data source config)            │
│  ├── /datasources/*   (multi-source connector)        │
│  ├── /analytics/*     (chart data queries)            │
│  ├── /nlq/ask         (Groq AI natural language)      │
│  ├── /publish/*       (publish CRUD)                  │
│  ├── /ws/kpis         (WebSocket live stream)         │
│  └── /health          (health check)                  │
├───────────────────────────────────────────────────────┤
│              PostgreSQL 16 + Simulator                 │
│  Auto-generates realistic KPI data for demo           │
└───────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
digital_twin_2/
├── src/                          # Frontend (React)
│   ├── components/               # Reusable UI components
│   │   ├── Navbar.jsx            # Top navigation + wizard breadcrumb
│   │   ├── Scene3D.jsx           # Three.js 3D renderer
│   │   └── Grid2D.jsx            # 2D layout editor canvas
│   ├── pages/                    # App pages (step-based + URL-routed)
│   │   ├── HomePage.jsx          # Landing page + published dashboards
│   │   ├── FormStep.jsx          # Step 1: Configure twin
│   │   ├── GridStep.jsx          # Step 2: Design layout
│   │   ├── ConnectionsStep.jsx   # Step 3: Wire components
│   │   ├── KpiStep.jsx           # Step 4: Assign KPIs
│   │   ├── TwinView.jsx          # Step 5: Live view + NLQ + Publish
│   │   ├── DataSourceWizard.jsx  # Connect data sources (DB/CSV)
│   │   └── PublishedView.jsx     # /view/:pubId — shareable viewer
│   ├── hooks/
│   │   └── useKpiWebSocket.js    # WebSocket hook (auto-reconnect)
│   ├── store/
│   │   └── useTwinStore.js       # Zustand global state
│   ├── services/
│   │   └── api.js                # HTTP client helpers
│   ├── App.jsx                   # React Router (admin + published)
│   ├── main.jsx                  # Entry point (BrowserRouter)
│   └── index.css                 # Design system (CSS variables)
│
├── backend/                      # Backend (FastAPI)
│   ├── routers/                  # API route handlers
│   │   ├── layout.py             # Twin layout CRUD
│   │   ├── kpis.py               # KPI definitions + history
│   │   ├── source.py             # Data source management
│   │   ├── datasources.py        # Multi-source connector
│   │   ├── nlq.py                # Groq NLQ AI endpoint
│   │   └── publish.py            # Publish dashboard CRUD
│   ├── connectors/               # Data source connectors
│   │   ├── postgresql.py         # PostgreSQL connector
│   │   └── csv_connector.py      # CSV/Excel file connector
│   ├── db/
│   │   ├── connection.py         # asyncpg connection pool
│   │   └── schema.sql            # Database schema (auto-init)
│   ├── ws/
│   │   └── kpi_stream.py         # WebSocket KPI broadcaster
│   ├── simulator/
│   │   └── data_gen.py           # Realistic KPI data generator
│   ├── main.py                   # FastAPI app entry point
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Dev Dockerfile
│   └── Dockerfile.prod           # Production Dockerfile
│
├── nginx/
│   └── nginx.conf                # Reverse proxy (SPA + API + WebSocket)
│
├── docker-compose.yml            # Development stack (backend + postgres)
├── docker-compose.prod.yml       # Production stack (+ nginx + cloudflared)
├── Dockerfile.frontend           # Multi-stage: Vite build → Nginx
├── .env.production               # Env template (fill before deploy)
├── deploy.sh                     # One-click deployment script
├── DEPLOYMENT.md                 # Step-by-step deployment guide
├── vite.config.js                # Vite dev config with proxy
└── package.json                  # Node.js dependencies
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- **Node.js** 18+ and **npm**
- **Docker** and **Docker Compose**

### 1. Start the backend (Docker)
```bash
docker compose up -d --build
```
This starts PostgreSQL + FastAPI backend with auto-schema creation and data simulator.

### 2. Start the frontend (Vite dev server)
```bash
npm install
npm run dev
```
Open **http://localhost:5174**

### 3. Try it out
1. Click **"View Live Demo"** to see the platform with simulated data
2. Or click **"Connect Data Source"** to connect your own PostgreSQL database
3. Build a layout → assign KPIs → watch live data → publish a shareable link

---

## 🌐 Production Deployment (Oracle Cloud + Cloudflare)

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full step-by-step guide.

### TL;DR
```bash
# On your Oracle Cloud VM:
git clone https://github.com/Hibabenkaddour/digital-twin-ui.git
cd digital-twin-ui/digital_twin_2
cp .env.production .env.prod
nano .env.prod  # Fill in passwords, GROQ_API_KEY
chmod +x deploy.sh
./deploy.sh
```

All 4 services run with `restart: always`:
- **PostgreSQL** — persistent data volume
- **FastAPI Backend** — 2 uvicorn workers
- **Nginx** — serves React SPA + reverse proxy to API/WebSocket
- **Cloudflare Tunnel** — free public HTTPS URL

---

## 🔗 How Published Links Work

```
Project Manager                         Employee
───────────────                         ────────
1. Open platform                        
2. Build dashboard (steps 1-5)          
3. Click "🚀 Publish"                  
4. Get URL: /view/pub_abc123           
5. Send link to employee        ──►     1. Open link in browser
                                        2. See live dashboard:
                                           ✅ Real-time KPIs (WebSocket)
                                           ✅ NLQ AI Chat (Groq)
                                           ✅ Interactive Charts
                                           ✅ 3D Digital Twin
                                           ✅ No login required
```

Published dashboards use the **same backend and database** — if the PM modifies anything, the published link reflects changes automatically.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Three.js (react-three-fiber), Recharts, Zustand, React Router |
| Backend | Python 3.12, FastAPI, Uvicorn, asyncpg |
| Database | PostgreSQL 16 |
| AI | Groq API (Llama 3.3 70B Versatile) |
| Styling | Vanilla CSS with design tokens |
| WebSocket | Native WebSocket with auto-reconnect |
| Deployment | Docker Compose, Nginx, Cloudflare Tunnel |

---

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | API key from [console.groq.com](https://console.groq.com) |
| `ALLOWED_ORIGINS` | ❌ | CORS origins (default: `*`) |
| `POSTGRES_USER` | ✅ (prod) | Database username |
| `POSTGRES_PASSWORD` | ✅ (prod) | Database password |
| `POSTGRES_DB` | ✅ (prod) | Database name |

---

## 👥 Authors

- **Hiba Benkaddour** — [GitHub](https://github.com/Hibabenkaddour)

---

## 📄 License

This project is for educational and demonstration purposes.
