"""
main.py — FastAPI application entry point
Registers all routers, WebSocket, CORS, and background simulator.
"""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from db.connection import get_pool, close_pool
from routers import source, layout, kpis, nlq, datasources, publish
from ws.kpi_stream import kpi_ws_handler
from simulator.data_gen import run_simulator

_sim_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────
    global _sim_task
    await get_pool()                     # warm up DB pool
    _sim_task = asyncio.create_task(run_simulator())
    print("[Backend] Started — simulator running")
    yield
    # ── Shutdown ─────────────────────────────────────────────
    if _sim_task:
        _sim_task.cancel()
    await close_pool()
    print("[Backend] Shutdown")


app = FastAPI(
    title="Digital Twin 2 Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (env-based, production-safe) ─────────────────────────
_cors_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:5175,*")
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
