import os
import asyncio
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from db.database import create_tables
from routers import layout, kpis, analytics
from routers.stream import router as stream_router, kpi_broadcaster, manager
from routers.data_source import router as source_router, get_source_state

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s — %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Digital Twin Platform API",
    description=(
        "FastAPI backend · LLM layout editing · Single-source KPI import · "
        "Column→component assignment · NLQ analytics · Real-time WebSocket streaming"
    ),
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── Global error handler — always return JSON, never HTML ───────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {type(exc).__name__}: {str(exc)}"},
    )

# ─── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(layout.router)
app.include_router(kpis.router)
app.include_router(analytics.router)
app.include_router(stream_router)         # WebSocket + /stream/status
app.include_router(source_router)         # /source/upload, /source/assign, etc.

# ─── Connector registry ───────────────────────────────────────────────────────
_connectors = []


async def _start_connectors():
    from connectors.file_connector import FileConnector
    from connectors.mqtt_connector import MqttConnector, MQTT_ENABLED
    from connectors.rest_connector import RestConnector, REST_ENABLED
    from routers.data_source import UPLOADED_SOURCE, get_source_state

    state = get_source_state()

    # File connector — primary source (real data from uploaded file)
    saved_assignments = state.get("assignments", {})
    existing_file = UPLOADED_SOURCE if os.path.exists(UPLOADED_SOURCE) else None

    file_mode = os.getenv("FILE_CONNECTOR_MODE", "replay")  # replay | tail
    replay_speed = float(os.getenv("REPLAY_SPEED", "2.0"))  # rows/sec

    fc = FileConnector({
        "file_path": existing_file,
        "assignments": saved_assignments,
        "mode": file_mode,
        "replay_speed": replay_speed,
        "poll_interval": float(os.getenv("TAIL_POLL_INTERVAL", "2.0")),
    })
    _connectors.append(fc)
    await fc.start()
    if existing_file:
        logger.info(f"📂 File connector started — source: {os.path.basename(existing_file)} ({file_mode} mode)")
    else:
        logger.info("📂 File connector started — waiting for source upload at POST /source/upload")

    # MQTT (optional, for real IoT sensors)
    if MQTT_ENABLED:
        mqtt = MqttConnector({})
        _connectors.append(mqtt)
        await mqtt.start()
        logger.info("📡 MQTT connector started")

    # REST polling (optional, for vendor APIs)
    if REST_ENABLED:
        rest = RestConnector({})
        _connectors.append(rest)
        await rest.start()
        logger.info("🌐 REST connector started")


# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    create_tables()

    from services.llm_service import has_real_llm, OLLAMA_MODEL, USE_OLLAMA
    if USE_OLLAMA:
        if has_real_llm():
            logger.info(f"🦙 LLM: Ollama [{OLLAMA_MODEL}]")
        else:
            logger.warning(f"🦙 LLM: Ollama not reachable — mock fallback (run: ollama serve && ollama pull {OLLAMA_MODEL})")
    else:
        logger.info("🤖 LLM: OpenAI" if has_real_llm() else "🤖 LLM: mock fallback")

    asyncio.create_task(kpi_broadcaster(), name="kpi_broadcaster")
    logger.info("📡 WebSocket broadcaster started — ws://localhost:8000/ws/kpis")

    await _start_connectors()
    logger.info("✅ Digital Twin Backend v2.1 ready — http://localhost:8000/docs")


@app.on_event("shutdown")
async def shutdown():
    for c in _connectors:
        await c.stop()


# ─── Root ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    from services.llm_service import has_real_llm, USE_OLLAMA, OLLAMA_MODEL, OPENAI_MODEL
    from connectors.file_connector import get_file_connector
    fc = get_file_connector()
    return {
        "name": "Digital Twin Platform API",
        "version": "2.1.0",
        "docs": "/docs",
        "llm_mode": "ollama" if (USE_OLLAMA and has_real_llm()) else ("openai" if has_real_llm() else "mock"),
        "model": OLLAMA_MODEL if USE_OLLAMA else OPENAI_MODEL,
        "ws_endpoint": "ws://localhost:8000/ws/kpis",
        "source_status": {
            "connected": fc.file_path is not None if fc else False,
            "mode": fc.mode if fc else None,
            "assignments": len(fc.assignments) if fc else 0,
        },
        "endpoints": {
            "upload_source":  "POST /source/upload",
            "assign_columns": "POST /source/assign",
            "source_schema":  "GET  /source/schema",
            "layout_prompt":  "POST /layout/prompt",
            "nlq_query":      "POST /analytics/query",
            "ws_stream":      "WS   /ws/kpis",
        }
    }


@app.get("/health")
def health():
    from connectors.file_connector import get_file_connector
    fc = get_file_connector()
    return {
        "status": "ok",
        "source_connected": fc.file_path is not None if fc else False,
        "ws_clients": manager.client_count,
        "connectors": [c.name for c in _connectors if c._running],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "true").lower() == "true",
    )
