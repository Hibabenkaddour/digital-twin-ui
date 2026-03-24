"""
WebSocket router — streams real-time KPI readings to all connected browser clients.

Each client connects to ws://localhost:8000/ws/kpis?domain=airport
The server broadcasts every reading from the KPI_BUS immediately.

Message format sent to clients:
  { "type": "kpi", "componentId": "...", "kpiName": "...",
    "value": 1234, "unit": "pax/h", "timestamp": "...",
    "status": "green|orange|red", "source": "simulator|mqtt|rest" }

Special messages:
  { "type": "ping" }  — heartbeat every 15s
  { "type": "snapshot", "readings": [...] } — latest value of every KPI on connect
"""
from __future__ import annotations
import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from connectors.base import KPI_BUS, KpiReading

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Stream"])

# ── Connection manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self._clients: set[WebSocket] = set()
        self._latest: dict[str, dict] = {}   # key = "component_id:kpi_name"

    def clear_latest(self):
        self._latest = {}
        logger.info("WS snapshot cache cleared")

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._clients.add(ws)
        logger.info(f"WS client connected — total: {len(self._clients)}")
        # Send snapshot of latest known values right away
        if self._latest:
            await ws.send_text(json.dumps({
                "type": "snapshot",
                "readings": list(self._latest.values()),
                "ts": datetime.now(timezone.utc).isoformat(),
            }))

    def disconnect(self, ws: WebSocket):
        self._clients.discard(ws)
        logger.info(f"WS client disconnected — total: {len(self._clients)}")

    def update_latest(self, reading: KpiReading):
        key = f"{reading.component_id}:{reading.kpi_name}"
        self._latest[key] = reading.to_dict()

    async def broadcast(self, message: dict):
        dead = set()
        payload = json.dumps(message)
        for ws in self._clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)


manager = ConnectionManager()


# ── Background broadcaster — drains KPI_BUS and broadcasts ───────────────────

async def kpi_broadcaster():
    """
    Single background task: reads from KPI_BUS queue and broadcasts to all WS clients.
    Also persists to DB in background (non-blocking).
    """
    while True:
        try:
            reading: KpiReading = await asyncio.wait_for(KPI_BUS.get(), timeout=15.0)
            manager.update_latest(reading)

            if manager.client_count > 0:
                await manager.broadcast({
                    "type": "kpi",
                    **reading.to_dict(),
                })

            # Persist to DB asynchronously (don't block the broadcast loop)
            asyncio.create_task(_persist_reading(reading))

        except asyncio.TimeoutError:
            # Heartbeat when no data
            if manager.client_count > 0:
                await manager.broadcast({
                    "type": "ping",
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "clients": manager.client_count,
                })
        except Exception as e:
            logger.error(f"Broadcaster error: {e}")


async def _persist_reading(reading: KpiReading):
    """Persist a KPI reading to SQLite in background."""
    try:
        from db.database import SessionLocal
        from db.crud import insert_kpi_records
        db = SessionLocal()
        try:
            insert_kpi_records(db, reading.component_id, reading.kpi_name, [{
                "value": reading.value,
                "unit": reading.unit,
                "timestamp": reading.timestamp,
                "source": reading.source,
            }])
        finally:
            db.close()
    except Exception as e:
        logger.debug(f"Persist error (non-fatal): {e}")


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws/kpis")
async def kpi_stream(
    websocket: WebSocket,
    domain: str = Query("airport"),
):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; handle client pings
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except asyncio.TimeoutError:
                pass  # normal — connection still alive
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)


# ── REST endpoints for WS status ─────────────────────────────────────────────

@router.get("/stream/status")
def stream_status():
    return {
        "connected_clients": manager.client_count,
        "kpi_bus_size": KPI_BUS.qsize(),
        "latest_kpis": len(manager._latest),
        "latest_snapshot": list(manager._latest.values())[:10],
    }
