# 🧱 Digital Twin Platform — Complete Technology Stack

> **Project:** Real-Time Digital Twin Platform for Airport / Factory / Warehouse  
> **Organization:** DXC Intelligent Analytics  
> **Date:** March 2026

---

## 🖥️ Frontend

### Core Framework
| Technology | Version | Role |
|---|---|---|
| **React** | 19.2 | UI component framework |
| **React DOM** | 19.2 | DOM rendering |
| **Vite** | 7.3 | Dev server, HMR, production bundler |

### 3D Visualization
| Technology | Version | Role |
|---|---|---|
| **Three.js** | 0.183 | Low-level 3D WebGL rendering engine |
| **@react-three/fiber** | 9.5 | React renderer for Three.js scenes |
| **@react-three/drei** | 10.7 | Three.js helpers (OrbitControls, Text, etc.) |

### Data Visualization / Charts
| Technology | Version | Role |
|---|---|---|
| **Recharts** | 3.8 | SVG-based charts (Line, Area, Bar, Radar, Pie) |

### State Management
| Technology | Version | Role |
|---|---|---|
| **Zustand** | 5.0 | Lightweight global state store (KPIs, layout, components) |

### UI / Styling
| Technology | Version | Role |
|---|---|---|
| **Vanilla CSS** | — | All custom styling, CSS variables, animations |
| **Framer Motion** | 12.35 | Micro-animations, page transitions |
| **Lucide React** | 0.577 | Icon library |
| **@fontsource/inter** | 5.2 | Inter typeface (self-hosted Google Font) |

### Real-Time Communication
| Technology | Role |
|---|---|
| **WebSocket API** (native browser) | Real-time KPI data streaming from backend |
| **Custom `useKpiWebSocket` hook** | Auto-reconnect, exponential backoff, snapshot on connect |

### Dev Tools
| Technology | Version | Role |
|---|---|---|
| **ESLint** | 9.39 | Code linting |
| **eslint-plugin-react-hooks** | 7.0 | Hooks linting rules |
| **@vitejs/plugin-react** | 5.1 | Vite React plugin (Babel/SWC HMR) |

---

## ⚙️ Backend

### Web Framework
| Technology | Version | Role |
|---|---|---|
| **FastAPI** | 0.115 | REST API + WebSocket server |
| **Uvicorn** | 0.34 | ASGI server (runs FastAPI) |
| **python-multipart** | 0.0.20 | File upload parsing (multipart/form-data) |
| **Pydantic** | 2.10 | Request/response validation & schemas |
| **Pydantic Settings** | 2.7 | Environment variable configuration |
| **python-dotenv** | 1.0 | `.env` file loading |

### Database
| Technology | Version | Role |
|---|---|---|
| **SQLite** | (built-in) | Lightweight local database for KPI records |
| **SQLAlchemy** | 2.0 | ORM — models, queries, session management |
| **aiosqlite** | 0.20 | Async SQLite driver for non-blocking I/O |

### Data Processing
| Technology | Version | Role |
|---|---|---|
| **Pandas** | 2.2 | CSV/Excel parsing, column stats, data manipulation |
| **openpyxl** | 3.1 | Excel file (.xlsx) read/write support |

### HTTP Client
| Technology | Version | Role |
|---|---|---|
| **httpx** | 0.28 | Async HTTP client (REST connector polling) |

---

## 🤖 AI / LLM Layer

### LLM Frameworks
| Technology | Version | Role |
|---|---|---|
| **LangChain** | 0.3.13 | LLM orchestration, prompt templates, chains |
| **LangGraph** | 0.2.60 | Stateful multi-step AI agents (layout editing, NLQ) |
| **langchain-ollama** | 0.2.3 | Ollama integration (local LLM) |
| **langchain-openai** | 0.3.1 | OpenAI integration (optional override) |
| **langchain-community** | 0.3.13 | Community tools and document loaders |

### LLM Models
| Model | Provider | Usage |
|---|---|---|
| **Llama 3.2** (default) | Ollama (local) | Layout prompts, NLQ queries, chart generation |
| **GPT-4o** (optional) | OpenAI API | Override via `OPENAI_API_KEY` env variable |

### AI Agents Built
| Agent | Technology | Role |
|---|---|---|
| **LayoutAgent** | LangGraph | Modifies 2D/3D floor plan from natural language prompts |
| **NLQAgent** | LangChain chain | Translates user questions into KPI data queries |
| **ChartAgent** | LangChain chain | Selects chart type, axes, and data based on prompt |

---

## 📡 Real-Time Data Pipeline

### Architecture Pattern
```
[Data Source File]
       ↓ (FileConnector · replay/tail mode)
   [KPI_BUS]  ← asyncio.Queue
       ↓ (kpi_broadcaster background task)
  [WebSocket /ws/kpis]
       ↓
  [Browser · useKpiWebSocket hook]
       ↓
  [Zustand Store · updateKpiFromWS]
       ↓
  [KpiCharts · KpiPanel · Scene3D]
```

### Connectors (Data Ingest)
| Connector | Protocol | Status | Role |
|---|---|---|---|
| **FileConnector** | File I/O | ✅ Active | Streams uploaded CSV/Excel rows |
| **MqttConnector** | MQTT | 🔧 Optional (env flag) | Subscribes to IoT sensor topics |
| **RestConnector** | HTTP REST | 🔧 Optional (env flag) | Polls external APIs (AODB, SCADA, etc.) |
| **SimulatorConnector** | Internal | 🧪 Dev only | Generates realistic fake KPIs |

### IoT / Messaging Protocols
| Technology | Role |
|---|---|
| **MQTT (paho-mqtt)** | IoT sensor data ingestion |
| **WebSocket (FastAPI native)** | Real-time browser streaming |
| **REST (httpx)** | External system polling |

---

## 🗄️ Infrastructure & DevOps

### Runtime Environment
| Technology | Role |
|---|---|
| **Python 3.11+** | Backend runtime |
| **Node.js 20+** | Frontend dev server & bundler |
| **Windows 11** | Development OS |

### Version Control
| Technology | Role |
|---|---|
| **Git** | Version control |
| **GitHub** | Remote repository |

### Configuration
| Technology | Role |
|---|---|
| **`.env` file** | Environment variables (API keys, ports, domain, connector flags) |
| **`assignments.json`** | Persisted KPI column → component assignments |

---

## 📁 Project Structure Summary

```
Intelligent_analytics_group/
├── digital-twin-backend/          # FastAPI Python backend
│   ├── main.py                    # App entry point
│   ├── routers/                   # API route handlers
│   │   ├── layout.py              # LLM layout editing
│   │   ├── kpis.py                # KPI CRUD + history
│   │   ├── analytics.py           # NLQ + chart agent
│   │   ├── stream.py              # WebSocket broadcaster
│   │   └── data_source.py         # File upload + column assignment
│   ├── connectors/                # Real-time data connectors
│   │   ├── base.py                # AbstractConnector + KPI_BUS
│   │   ├── file_connector.py      # CSV/Excel streaming
│   │   ├── mqtt_connector.py      # IoT MQTT
│   │   ├── rest_connector.py      # REST API polling
│   │   └── simulator.py           # Demo data generator
│   ├── services/
│   │   ├── llm_service.py         # Ollama / OpenAI LLM
│   │   └── data_service.py        # Pandas + stats helpers
│   ├── db/
│   │   ├── database.py            # SQLAlchemy setup
│   │   ├── models.py              # ORM models
│   │   └── crud.py                # DB queries
│   └── sample_data/               # Sample CSVs (airport/factory/warehouse)
│
└── digital-twin-ui/               # React + Vite frontend
    └── src/
        ├── pages/
        │   ├── FormStep.jsx        # Step 1: Configure
        │   ├── GridStep.jsx        # Step 2: Layout
        │   ├── ConnectionsStep.jsx # Step 3: Connections
        │   ├── KpiStep.jsx         # Step 4: Data source setup
        │   └── TwinView.jsx        # Step 5: Live dashboard
        ├── components/
        │   ├── Scene3D.jsx         # Three.js 3D digital twin
        │   ├── KpiPanel.jsx        # Live KPI cards
        │   ├── KpiCharts.jsx       # Recharts visualizations
        │   ├── Chatbot.jsx         # NLQ AI chatbot
        │   └── DataSourcePanel.jsx # Source connection UI
        ├── hooks/
        │   └── useKpiWebSocket.js  # Real-time WS hook
        ├── store/
        │   └── useTwinStore.js     # Zustand global state
        └── services/
            └── api.js              # Typed REST API client
```

---

## 🔢 Stats

| Category | Count |
|---|---|
| Frontend libraries | **11** |
| Backend libraries | **16** |
| AI/LLM libraries | **5** |
| Data connectors | **4** |
| Real-time protocols | **3** (WebSocket, MQTT, REST) |
| Supported domains | **3** (Airport, Factory, Warehouse) |
| Total source files | ~**30+** |
