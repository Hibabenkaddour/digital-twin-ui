"""
Data Source Router — Manages the Postgres Database Connection and KPI mapping.
"""
import json
import os
import psycopg2
from datetime import datetime
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/source", tags=["Data Source"])

# ── Shared state ──────────────────────────────────────────────────────────────
_source_state = {
    "domain": "factory",
    "columns": [],
    "assignments": {},         # { kpi_id: { component_id, kpi_name, formula, unit, rules, interaction } }
    "connected_at": None,
    "streaming": False,
    "telemetry_db_url": None,
    "telemetry_table": None,
}

SOURCE_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "source_data")
ASSIGNMENTS_FILE = os.path.join(SOURCE_DATA_DIR, "db_assignments.json")
os.makedirs(SOURCE_DATA_DIR, exist_ok=True)

def _load_saved_assignments():
    if os.path.exists(ASSIGNMENTS_FILE):
        with open(ASSIGNMENTS_FILE) as f:
            saved = json.load(f)
            _source_state["assignments"] = saved.get("assignments", {})
            _source_state["domain"] = saved.get("domain", "factory")
            _source_state["telemetry_db_url"] = saved.get("telemetry_db_url")
            _source_state["telemetry_table"] = saved.get("telemetry_table")

_load_saved_assignments()

class KpiRule(BaseModel):
    green: Optional[List[float]] = None
    orange: Optional[List[float]] = None
    red: Optional[List[float]] = None

class ColAssignment(BaseModel):
    kpi_id: str
    component_id: str
    kpi_name: str
    formula: str
    unit: str = ""
    rules: dict = {}
    interaction: str = "pulse"

class AssignmentsPayload(BaseModel):
    domain: str
    assignments: List[ColAssignment]

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/digital_twin")

def get_db_columns(table_name: str, db_url: str) -> list:
    if not table_name or not db_url:
        return []
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name NOT IN ('timestamp', 'component_id');
        """, (table_name,))
        cols = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        return cols
    except Exception as e:
        print(f"Error fetching schema: {e}")
        return []

# ── Endpoints ─────────────────────────────────────────────────────────────────

class ConnectPayload(BaseModel):
    db_url: str

@router.post("/connect")
def connect_telemetry_db(payload: ConnectPayload):
    try:
        conn = psycopg2.connect(payload.db_url)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        """)
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        
        _source_state["telemetry_db_url"] = payload.db_url
        return {"connected": True, "tables": tables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {e}")

class TablePayload(BaseModel):
    table_name: str

@router.post("/table")
def select_table(payload: TablePayload):
    _source_state["telemetry_table"] = payload.table_name
    return {"table": payload.table_name}

@router.get("/schema")
def get_schema():
    """
    Fetch the column list from the postgres database for the selected table.
    """
    table = _source_state.get("telemetry_table")
    db_url = _source_state.get("telemetry_db_url")
    cols = get_db_columns(table, db_url)
    
    return {
        "table": table,
        "columns": cols,
        "assignments": _source_state.get("assignments", {}),
        "streaming": _source_state.get("streaming", False),
    }

@router.post("/assign")
async def assign_columns(payload: AssignmentsPayload):
    """
    Save the user-defined mathematical KPIs mapping.
    """
    new_assignments = {}
    for a in payload.assignments:
        new_assignments[a.kpi_id] = {
            "component_id": a.component_id,
            "kpi_name": a.kpi_name,
            "formula": a.formula,
            "unit": a.unit,
            "rules": a.rules,
            "interaction": a.interaction,
        }
    
    _source_state["assignments"] = new_assignments
    _source_state["domain"] = payload.domain
    _source_state["streaming"] = True
    _source_state["connected_at"] = _source_state.get("connected_at") or datetime.utcnow().isoformat()

    # Flush the stale KPI readings in the queue so deleted KPIs don't ghost resurrect
    try:
        from connectors.base import KPI_BUS
        while not KPI_BUS.empty():
            KPI_BUS.get_nowait()
            
        from routers.stream import manager
        manager.clear_latest()
    except Exception as e:
        print(f"Failed to flush KPI bus: {e}")

    # Persist
    with open(ASSIGNMENTS_FILE, "w") as f:
        json.dump({
            "domain": payload.domain, 
            "assignments": new_assignments,
            "telemetry_db_url": _source_state.get("telemetry_db_url"),
            "telemetry_table": _source_state.get("telemetry_table")
        }, f, indent=2)

    # Restart/notify the Postgres connector
    try:
        from connectors.postgres_connector import get_postgres_connector
        pc = get_postgres_connector()
        if pc:
            pc.update_assignments(
                new_assignments, 
                payload.domain,
                db_url=_source_state.get("telemetry_db_url"),
                table_name=_source_state.get("telemetry_table")
            )
            if not pc._running:
                import asyncio
                asyncio.create_task(pc.start())
    except Exception as e:
        print(f"Failed to notify postgres connector: {e}")

    return {"saved": len(new_assignments), "assignments": new_assignments}

def apply_assignments_sync(domain: str, assignments_list: list):
    """
    Synchronously update the global active KPI assignments when a Twin is loaded.
    """
    new_assignments = {}
    for a in assignments_list:
        kpi_id = a.get("kpi_id", a.get("id"))
        if not kpi_id: continue
        new_assignments[kpi_id] = {
            "component_id": a.get("component_id"),
            "kpi_name": a.get("kpi_name"),
            "formula": a.get("formula"),
            "unit": a.get("unit", ""),
            "rules": a.get("rules", {}),
            "interaction": a.get("interaction", "pulse"),
        }
    
    _source_state["assignments"] = new_assignments
    _source_state["domain"] = domain
    _source_state["streaming"] = True
    _source_state["connected_at"] = _source_state.get("connected_at") or datetime.utcnow().isoformat()

    try:
        from connectors.base import KPI_BUS
        while not KPI_BUS.empty():
            KPI_BUS.get_nowait()
            
        from routers.stream import manager
        manager.clear_latest()
    except Exception as e:
        print(f"Failed to flush KPI bus: {e}")

    with open(ASSIGNMENTS_FILE, "w") as f:
        json.dump({
            "domain": domain, 
            "assignments": new_assignments,
            "telemetry_db_url": _source_state.get("telemetry_db_url"),
            "telemetry_table": _source_state.get("telemetry_table")
        }, f, indent=2)

    try:
        from connectors.postgres_connector import get_postgres_connector
        pc = get_postgres_connector()
        if pc:
            pc.update_assignments(
                new_assignments, 
                domain,
                db_url=_source_state.get("telemetry_db_url"),
                table_name=_source_state.get("telemetry_table")
            )
            if not pc._running:
                import asyncio
                try:
                    loop = asyncio.get_running_loop()
                    loop.create_task(pc.start())
                except RuntimeError:
                    pass
    except Exception as e:
        print(f"Failed to notify postgres connector: {e}")

class ProposeKpisRequest(BaseModel):
    domain: str
    columns: List[str]

@router.post("/propose_kpis")
async def propose_kpis_endpoint(payload: ProposeKpisRequest):
    from agents.kpi_agent import propose_kpis
    kpis = await propose_kpis(payload.domain, payload.columns)
    return {"kpis": kpis}

@router.get("/status")
def get_status():
    from connectors.postgres_connector import get_postgres_connector
    pc = get_postgres_connector()
    
    if len(_source_state["columns"]) == 0 and _source_state.get("telemetry_table"):
        _source_state["columns"] = get_db_columns(_source_state["telemetry_table"], _source_state["telemetry_db_url"])
        
    assigned_count = len(_source_state.get("assignments", {}))

    return {
        "connected": len(_source_state["columns"]) > 0,
        "streaming": _source_state.get("streaming", False) or assigned_count > 0,
        "domain": _source_state.get("domain"),
        "assignedColumns": assigned_count,
        "connectedAt": _source_state.get("connected_at"),
        "connectorRunning": pc._running if pc else False,
    }

@router.delete("")
def disconnect_source():
    _source_state.update({
        "columns": [], "streaming": False, "assignments": {},
        "telemetry_db_url": None, "telemetry_table": None
    })
    return {"status": "disconnected"}

def get_source_state():
    return _source_state
