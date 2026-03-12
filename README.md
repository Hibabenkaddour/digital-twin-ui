# 🏭 Digital Twin Platform — DXC Intelligent Analytics

A **React + Three.js** frontend for a **3D Agnostic Digital Twin** platform, built as a visual interactive demo for factory, airport, and warehouse environments.

## ✨ Features

- **Interactive 3D Scene** (React Three Fiber) with domain-specific shapes per component type
- **Drag-to-move** components in 2D grid and 3D view (Ctrl+drag)
- **Add components** via toolbar buttons — any blueprint type, any time
- **Live KPI monitoring** with real-time updates every 3 seconds
- **KPI Charts** — area charts with threshold overlays per KPI (Recharts)
- **Analytics AI Chatbot** — ask natural language questions about your KPIs
- **Step-by-step wizard**: Configure → Layout → Connections → KPIs → Live View
- **3 domains**: Factory 🏭 · Airport ✈️ · Warehouse 📦
- **Multiple camera views**: Isometric, Top-Down, Free

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| 3D Engine | React Three Fiber + Drei + Three.js |
| State | Zustand |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |
| Fonts | Inter (fontsource) |

## 🛠️ Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📁 Project Structure

```
src/
├── store/
│   └── useTwinStore.js      # Zustand global state + AI responses
├── components/
│   ├── Scene3D.jsx           # 3D scene with domain-specific shapes
│   ├── Grid2D.jsx            # 2D grid editor with drag-to-move
│   ├── KpiPanel.jsx          # Live KPI sidebar
│   ├── KpiCharts.jsx         # Recharts KPI visualization
│   ├── Chatbot.jsx           # Analytics AI chatbot
│   └── Navbar.jsx            # Top navigation + wizard breadcrumb
└── pages/
    ├── HomePage.jsx          # Landing page with domain selection
    ├── FormStep.jsx          # Twin configuration form
    ├── GridStep.jsx          # Layout editor (2D + 3D split)
    ├── ConnectionsStep.jsx   # Connection visualization
    ├── KpiStep.jsx           # KPI & data adapter config
    └── TwinView.jsx          # Live twin dashboard
```

## 🎨 Screenshots

> Configure your domain → Design the layout → Monitor live KPIs → Chat with AI analytics

## 📄 License

MIT — DXC Technology Intelligent Analytics Group
