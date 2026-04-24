"""
main.py — FastAPI application entry point
Registers all routers, WebSocket, CORS, and background simulator.
"""
import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from db.connection import get_pool, close_pool
from db.migrate import run_migrations
from routers import source, layout, kpis, nlq, datasources, publish
from ws.kpi_stream import kpi_ws_handler
from simulator.data_gen import run_simulator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_sim_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────
    global _sim_task
    pool = await get_pool()
    await run_migrations(pool)           # appliquer les migrations en attente
    _sim_task = asyncio.create_task(run_simulator())
    logger.info("Backend démarré — simulateur en cours d'exécution")
    yield
    # ── Shutdown ─────────────────────────────────────────────
    if _sim_task:
        _sim_task.cancel()
    await close_pool()
    logger.info("Backend arrêté")


app = FastAPI(
    title="Digital Twin 2 Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (env-based, production-safe) ─────────────────────────
# Le wildcard '*' est intentionnellement retiré du fallback.
# En production, définir ALLOWED_ORIGINS dans le .env.
_cors_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://localhost:5175"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST Routers ──────────────────────────────────────────────
app.include_router(source.router)
app.include_router(layout.router)
app.include_router(kpis.router)
app.include_router(nlq.router)
app.include_router(datasources.router)
app.include_router(publish.router)


# ── Health check ──────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    pool = await get_pool()
    await pool.fetchval("SELECT 1")
    return {"status": "ok"}


# ── WebSocket ─────────────────────────────────────────────────
@app.websocket("/ws/kpis")
async def ws_kpis(websocket: WebSocket, domain: str = Query("factory")):
    await kpi_ws_handler(websocket, domain)
