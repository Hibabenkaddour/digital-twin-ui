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

def get_db_columns(domain: str) -> list:
    table_name = f"{domain}_data"
    try:
        conn = psycopg2.connect(DB_URL)
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

@router.get("/schema")
def get_schema(domain: str = Query("factory")):
    """
    Fetch the column list from the postgres database for the requested domain.
    """
    cols = get_db_columns(domain)
    _source_state["columns"] = cols
    _source_state["domain"] = domain
    
    return {
        "domain": domain,
        "columns": cols,
        "assignments": _source_state.get("assignments", {}),
        "streaming": _source_state.get("streaming", False),
    }

@router.post("/assign")
def assign_columns(payload: AssignmentsPayload):
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
        json.dump({"domain": payload.domain, "assignments": new_assignments}, f, indent=2)

    # Restart/notify the Postgres connector
    try:
        from connectors.postgres_connector import get_postgres_connector
        pc = get_postgres_connector()
        if pc:
            pc.update_assignments(new_assignments, payload.domain)
            if not pc._running:
                import asyncio
                asyncio.create_task(pc.start())
    except Exception as e:
        print(f"Failed to notify postgres connector: {e}")

    return {"saved": len(new_assignments), "assignments": new_assignments}

@router.get("/status")
def get_status():
    from connectors.postgres_connector import get_postgres_connector
    pc = get_postgres_connector()
    
    if len(_source_state["columns"]) == 0 and _source_state.get("domain"):
        _source_state["columns"] = get_db_columns(_source_state["domain"])
        
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
        "columns": [], "streaming": False, "assignments": {}
    })
    return {"status": "disconnected"}

def get_source_state():
    return _source_state
