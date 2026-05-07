"""
Data Source Router — Manages Database Connections and KPI mapping for multiple sources.
Secured with Keycloak auth + tight timeouts.
"""
import json
import os
import psycopg2
from datetime import datetime
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from routers.auth import get_current_user

router = APIRouter(prefix="/source", tags=["Data Source"])

# ── Shared state ──────────────────────────────────────────────────────────────
_source_state = {
    "domain": "factory",
    "columns": [],
    "assignments": {},
    "connected_at": None,
    "streaming": False,
    "source_type": "postgres",
    "telemetry_db_url": None,
    "telemetry_table": None,
    "timestamp_col": "timestamp",
    "component_id_col": "component_id",
    "credentials": {}
}

SOURCE_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "source_data")
ASSIGNMENTS_FILE = os.path.join(SOURCE_DATA_DIR, "db_assignments.json")
os.makedirs(SOURCE_DATA_DIR, exist_ok=True)

def _load_saved_assignments():
    if os.path.exists(ASSIGNMENTS_FILE):
        try:
            with open(ASSIGNMENTS_FILE) as f:
                saved = json.load(f)
                _source_state.update({
                    "assignments": saved.get("assignments", {}),
                    "domain": saved.get("domain", "factory"),
                    "source_type": saved.get("source_type", "postgres"),
                    "telemetry_db_url": saved.get("telemetry_db_url"),
                    "telemetry_table": saved.get("telemetry_table"),
                    "timestamp_col": saved.get("timestamp_col", "timestamp"),
                    "component_id_col": saved.get("component_id_col", "component_id"),
                    "credentials": saved.get("credentials", {})
                })
        except Exception as e:
            print(f"Error loading saved assignments: {e}")

_load_saved_assignments()

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

class ConnectPayload(BaseModel):
    source_type: str = "postgres"
    db_url: str
    credentials: Dict[str, Any] = {}

class TablePayload(BaseModel):
    table_name: str
    timestamp_col: str = "timestamp"
    component_id_col: str = "component_id"

class ProposeKpisRequest(BaseModel):
    domain: str
    columns: List[str]

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_db_columns(table_name: str, db_url: str, source_type: str, credentials: dict, exclude_cols: list = None) -> list:
    if not table_name or not db_url:
        return []
    if exclude_cols is None:
        exclude_cols = []
    
    cols = []
    try:
        if source_type == "postgres":
            conn = psycopg2.connect(db_url, connect_timeout=3)
            cursor = conn.cursor()
            query = "SELECT column_name FROM information_schema.columns WHERE table_name = %s;"
            cursor.execute(query, (table_name,))
            cols = [row[0] for row in cursor.fetchall()]
            cursor.close()
            conn.close()
        elif source_type == "mongo":
            from pymongo import MongoClient
            client = MongoClient(db_url, serverSelectionTimeoutMS=3000)
            db = client[credentials.get("db_name", "digital_twin")]
            collection = db[table_name]
            doc = collection.find_one()
            if doc: cols = list(doc.keys())
            client.close()
    except Exception as e:
        print(f"Error fetching schema: {e}")
    return [c for c in cols if c not in exclude_cols]

def get_connector_instance():
    stype = _source_state.get("source_type", "postgres")
    config = {
        "db_url": _source_state.get("telemetry_db_url"),
        "table_name": _source_state.get("telemetry_table"),
        "timestamp_col": _source_state.get("timestamp_col"),
        "component_id_col": _source_state.get("component_id_col"),
    }
    config.update(_source_state.get("credentials", {}))

    if stype == "postgres":
        from connectors.postgres_connector import PostgresConnector, get_postgres_connector
        pc = get_postgres_connector()
        return pc if pc else PostgresConnector(config)
    return None

_active_connector = None

def register_active_connector(connector):
    """REQUIRED by main.py at startup."""
    global _active_connector
    _active_connector = connector

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/connect")
def connect_telemetry_db(payload: ConnectPayload, user_id: str = Depends(get_current_user)):
    tables = []
    try:
        if payload.source_type == "postgres":
            conn = psycopg2.connect(payload.db_url, connect_timeout=3)
            cursor = conn.cursor()
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
            tables = [row[0] for row in cursor.fetchall()]
            cursor.close()
            conn.close()
        
        _source_state.update({
            "source_type": payload.source_type,
            "telemetry_db_url": payload.db_url,
            "credentials": payload.credentials
        })
        return {"connected": True, "tables": tables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {e}")

@router.post("/table")
def select_table(payload: TablePayload, user_id: str = Depends(get_current_user)):
    _source_state.update({
        "telemetry_table": payload.table_name,
        "timestamp_col": payload.timestamp_col,
        "component_id_col": payload.component_id_col
    })
    _source_state["columns"] = get_db_columns(
        payload.table_name, _source_state["telemetry_db_url"], 
        _source_state["source_type"], _source_state["credentials"],
        exclude_cols=[payload.timestamp_col, payload.component_id_col]
    )
    return {"status": "ok"}

@router.post("/upload")
async def upload_source_file(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    from services.data_service import parse_upload, detect_columns
    
    file_bytes = await file.read()
    try:
        df = parse_upload(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")
    
    detected = detect_columns(df)
    columns = [c for c in df.columns if c != detected.get("timestamp")]
    
    column_stats = {}
    for col in columns:
        try:
            series = df[col].dropna()
            if pd.api.types.is_numeric_dtype(series):
                column_stats[col] = {
                    "min": round(float(series.min()), 2),
                    "max": round(float(series.max()), 2),
                    "mean": round(float(series.mean()), 2),
                    "count": int(series.count())
                }
        except:
            pass

    _source_state.update({
        "columns": columns,
        "source_type": "file",
        "telemetry_table": file.filename,
        "timestamp_col": detected.get("timestamp")
    })
    
    return {
        "fileName": file.filename,
        "columns": columns,
        "columnStats": column_stats,
        "rowCount": len(df),
        "timestampColumn": detected.get("timestamp")
    }

@router.get("/schema")
def get_schema(user_id: str = Depends(get_current_user)):
    cols = get_db_columns(
        _source_state.get("telemetry_table"), 
        _source_state.get("telemetry_db_url"), 
        _source_state.get("source_type"), 
        _source_state.get("credentials")
    )
    return {
        "table": _source_state.get("telemetry_table"),
        "columns": cols,
        "assignments": _source_state.get("assignments", {}),
        "streaming": _source_state.get("streaming", False),
    }

@router.post("/assign")
async def assign_columns(payload: AssignmentsPayload, user_id: str = Depends(get_current_user)):
    global _active_connector
    new_assignments = {a.kpi_id: {
        "component_id": a.component_id, "kpi_name": a.kpi_name,
        "formula": a.formula, "unit": a.unit, "rules": a.rules,
        "interaction": a.interaction
    } for a in payload.assignments}
    
    _source_state.update({
        "assignments": new_assignments, "domain": payload.domain,
        "streaming": True, "connected_at": datetime.utcnow().isoformat()
    })

    with open(ASSIGNMENTS_FILE, "w") as f:
        json.dump(_source_state, f, indent=2)

    if _active_connector and _active_connector._running:
        _active_connector.update_assignments(new_assignments, payload.domain)
    
    return {"saved": len(new_assignments)}

@router.get("/status")
def get_status(user_id: str = Depends(get_current_user)):
    return {
        "connected": len(_source_state["columns"]) > 0 or _source_state.get("source_type") in ["kafka", "mqtt"],
        "streaming": _source_state.get("streaming", False),
        "domain": _source_state.get("domain"),
        "assignedColumns": len(_source_state.get("assignments", {})),
        "connectedAt": _source_state.get("connected_at"),
        "connectorRunning": _active_connector._running if _active_connector else False,
    }

@router.delete("")
def disconnect_source(user_id: str = Depends(get_current_user)):
    _source_state.update({"columns": [], "streaming": False, "assignments": {}})
    return {"status": "disconnected"}

@router.post("/propose_kpis")
async def propose_kpis_endpoint(payload: ProposeKpisRequest, user_id: str = Depends(get_current_user)):
    from agents.kpi_agent import propose_kpis
    kpis = await propose_kpis(payload.domain, payload.columns)
    return {"kpis": kpis}

def apply_assignments_sync(domain: str, assignments_list: list):
    """Re-apply KPI assignments internally (called when loading twins)."""
    global _active_connector
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
    
    _source_state.update({"assignments": new_assignments, "domain": domain, "streaming": True})
    
    if _active_connector and _active_connector._running:
        _active_connector.update_assignments(new_assignments, domain)

def get_source_state():
    return _source_state
