"""
ws/kpi_stream.py
WebSocket endpoint: /ws/kpis?domain=factory|airport|warehouse
- On connect: sends snapshot of last 60 rows as evaluated KPI values
- Every 30 s: pushes live KPI readings based on fetched DB row + formula evaluation
- Also sends flow_status for connection animations
"""
import asyncio
import json
import logging
import numexpr
import numpy
from fastapi import WebSocket, WebSocketDisconnect
from db.connection import get_pool

logger = logging.getLogger(__name__)

DOMAIN_TABLE = {
    "factory":   "factory_data",
    "airport":   "airport_data",
    "warehouse": "warehouse_data",
}

DOMAIN_COLUMNS = {
    "factory":   ["temp_1","temp_2","pressure","energy_kwh","vibration","speed_rpm","throughput"],
    "airport":   ["passenger_count","gate_open","delay_min","runway_free","checkin_queue","baggage_wait","fuel_level"],
    "warehouse": ["stock_level","pick_rate","dock_util","order_backlog","conveyor_speed","sorter_error_rate","temp_zone"],
}


def _safe_eval(formula: str, row: dict) -> float:
    """Evaluate a formula string against a row dict using numexpr."""
    try:
        local_vars = {}
        for k, v in row.items():
            try:
                local_vars[k] = float(v)
            except (ValueError, TypeError):
                pass  # skip non-numeric fields (e.g. flow_status, recorded_at)
        result = numexpr.evaluate(formula, local_dict=local_vars)
        return float(numpy.atleast_1d(result)[0])
    except Exception:
        return 0.0


def _classify(value: float, orange: float | None, red: float | None, direction: str) -> str:
    if orange is None and red is None:
        return "green"
    if direction == "asc":  # higher is worse
        if red is not None and value >= red:
            return "red"
        if orange is not None and value >= orange:
            return "orange"
    else:  # direction == 'desc' — lower is worse
        if red is not None and value <= red:
            return "red"
        if orange is not None and value <= orange:
            return "orange"
    return "green"


async def _send(websocket: WebSocket, payload: dict) -> bool:
    """Envoie un message JSON. Retourne False si la connexion est fermée."""
    try:
        await websocket.send_text(json.dumps(payload))
        return True
    except Exception as e:
        logger.debug("WebSocket send failed (client likely disconnected): %s", e)
        return False


async def kpi_ws_handler(websocket: WebSocket, domain: str):
    # Validation du domaine avant d'accepter la connexion
    table = DOMAIN_TABLE.get(domain)
    if table is None:
        await websocket.close(code=1008, reason=f"Domaine invalide : {domain}")
        return

    await websocket.accept()
    pool = await get_pool()

    try:
        # ── Load KPI assignments for this domain ──────────────
        kpi_rows = await pool.fetch(
            "SELECT * FROM kpi_assignments WHERE domain = $1", domain
        )
        kpis = [dict(r) for r in kpi_rows]

        # ── Send snapshot (last 60 rows evaluated) ────────────
        # table name from whitelist, row count parameterized
        history = await pool.fetch(
            f"SELECT * FROM {table} ORDER BY id DESC LIMIT $1", 60
        )
        snapshot_readings = []
        for h_row in reversed(history):
            row_dict = dict(h_row)
            ts = row_dict["recorded_at"].isoformat()
            for kpi in kpis:
                val = _safe_eval(kpi["formula"], row_dict)
                status = _classify(val, kpi["orange_threshold"], kpi["red_threshold"], kpi["direction"])
                snapshot_readings.append({
                    "componentId": kpi["component_id"],
                    "kpiName":     kpi["kpi_name"],
                    "value":       round(val, 2),
                    "unit":        kpi["unit"],
                    "status":      status,
                    "timestamp":   ts,
                    "flowStatus":  row_dict.get("flow_status", "green"),
                    "meta": {
                        "interaction":  kpi["interaction"],
                        "rules": {
                            "orange": [float(kpi["orange_threshold"])] if kpi["orange_threshold"] else None,
                            "red":    [float(kpi["red_threshold"])]    if kpi["red_threshold"]    else None,
                        }
                    }
                })

        if not await _send(websocket, {"type": "snapshot", "readings": snapshot_readings}):
            return

        # ── Live streaming loop ───────────────────────────────
        while True:
            await asyncio.sleep(30)

            latest = await pool.fetchrow(
                f"SELECT * FROM {table} ORDER BY id DESC LIMIT $1", 1
            )
            if not latest:
                continue

            row_dict = dict(latest)
            ts = row_dict["recorded_at"].isoformat()
            flow = row_dict.get("flow_status", "green")

            for kpi in kpis:
                val    = _safe_eval(kpi["formula"], row_dict)
                status = _classify(val, kpi["orange_threshold"], kpi["red_threshold"], kpi["direction"])

                msg = {
                    "type":        "kpi",
                    "componentId": kpi["component_id"],
                    "kpiName":     kpi["kpi_name"],
                    "value":       round(val, 2),
                    "unit":        kpi["unit"],
                    "status":      status,
                    "timestamp":   ts,
                    "flowStatus":  flow,
                    "meta": {
                        "interaction": kpi["interaction"],
                        "rules": {
                            "orange": [float(kpi["orange_threshold"])] if kpi["orange_threshold"] else None,
                            "red":    [float(kpi["red_threshold"])]    if kpi["red_threshold"]    else None,
                        }
                    }
                }
                if not await _send(websocket, msg):
                    return

            # Also send flow_status event so connections panel updates
            if not await _send(websocket, {
                "type":       "flow",
                "domain":     domain,
                "flowStatus": flow,
            }):
                return

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("Erreur WebSocket (domain=%s) : %s", domain, e)
        try:
            await websocket.close()
        except Exception:
            pass
