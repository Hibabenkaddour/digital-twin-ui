"""
Data Source Router — manages the single data source connection.

Flow:
  1. POST /source/upload  → upload one CSV/Excel file, get back discovered columns + preview
  2. POST /source/assign  → save the mapping: column → component + KPI name
  3. GET  /source/schema  → returns current columns + assignments
  4. GET  /source/status  → is source connected & streaming?
  5. DELETE /source       → disconnect source

The file connector then watches the file for new rows and streams via WebSocket.
"""
import json
import os
import io
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import pandas as pd

from db.database import get_db
from services.data_service import parse_upload, detect_columns

router = APIRouter(prefix="/source", tags=["Data Source"])

# ── Shared state (singleton per process) ─────────────────────────────────────
_source_state = {
    "file_path": None,         # absolute path of uploaded file
    "file_name": None,
    "columns": [],             # all discovered numeric columns
    "timestamp_col": None,     # auto-detected timestamp column
    "assignments": {},         # { col_name: { component_id, component_name, kpi_name, unit, rules } }
    "row_count": 0,
    "connected_at": None,
    "streaming": False,
}

SOURCE_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "source_data")
ASSIGNMENTS_FILE = os.path.join(SOURCE_DATA_DIR, "assignments.json")
UPLOADED_SOURCE = os.path.join(SOURCE_DATA_DIR, "current_source.csv")

os.makedirs(SOURCE_DATA_DIR, exist_ok=True)

# Load saved assignments on startup
def _load_saved_assignments():
    if os.path.exists(ASSIGNMENTS_FILE):
        with open(ASSIGNMENTS_FILE) as f:
            _source_state["assignments"] = json.load(f)

_load_saved_assignments()


class ColumnAssignment(BaseModel):
    column: str
    component_id: str
    component_name: str
    kpi_name: str
    unit: str = ""
    rules: dict = {}   # e.g. {"orange": [1000, 1500], "red": [1500, 9999]}


class AssignmentsPayload(BaseModel):
    assignments: list[ColumnAssignment]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_source(file: UploadFile = File(...)):
    """
    Upload one CSV or Excel file containing all KPI columns.
    Returns: discovered columns, preview rows, auto-detected timestamp column.
    """
    if not file.filename.endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(400, "Only CSV and Excel files supported.")

    raw = await file.read()
    try:
        df = parse_upload(raw, file.filename)
    except Exception as e:
        raise HTTPException(400, f"Cannot parse file: {e}")

    # Detect timestamp column
    detected = detect_columns(df)
    ts_col = detected.get("timestamp")

    # All columns except timestamp → candidate KPI columns
    kpi_candidates = [c for c in df.columns if c != ts_col]

    # Save file as canonical CSV for the file connector
    os.makedirs(SOURCE_DATA_DIR, exist_ok=True)
    df.to_csv(UPLOADED_SOURCE, index=False)

    # Update shared state
    _source_state.update({
        "file_path": UPLOADED_SOURCE,
        "file_name": file.filename,
        "columns": kpi_candidates,
        "timestamp_col": ts_col,
        "row_count": len(df),
        "connected_at": datetime.utcnow().isoformat(),
        "streaming": True,
    })

    # Build preview (first 5 rows) — convert numpy types and NaN to plain Python
    try:
        preview_df = df.head(5).where(pd.notnull(df.head(5)), None)
        preview = [
            {k: (_safe_val(v)) for k, v in row.items()}
            for row in preview_df.to_dict(orient="records")
        ]
    except Exception:
        preview = []

    # Notify the file connector so it starts/restarts with the new file
    try:
        from connectors.file_connector import get_file_connector
        fc = get_file_connector()
        if fc:
            fc.set_source(UPLOADED_SOURCE)
            if _source_state.get("assignments"):
                fc.update_assignments(_source_state["assignments"])
    except Exception as e:
        pass  # connector may not be running yet — that's fine

    return {
        "fileName": file.filename,
        "rowCount": len(df),
        "timestampColumn": ts_col,
        "columns": kpi_candidates,
        "preview": preview,
        "columnStats": _compute_col_stats(df, kpi_candidates, ts_col),
    }


def _safe_val(v):
    """Convert numpy/pandas scalar to plain Python for JSON serialization."""
    import math
    if v is None:
        return None
    try:
        if isinstance(v, float) and math.isnan(v):
            return None
        # numpy int / float
        if hasattr(v, 'item'):
            return v.item()
        return v
    except Exception:
        return str(v)


def _compute_col_stats(df: pd.DataFrame, cols: list, ts_col: Optional[str]) -> dict:
    stats = {}
    for col in cols:
        try:
            series = pd.to_numeric(df[col], errors="coerce").dropna()
            stats[col] = {
                "min": round(float(series.min()), 2),
                "max": round(float(series.max()), 2),
                "mean": round(float(series.mean()), 2),
                "count": int(series.count()),
                "sample": round(float(series.iloc[-1]), 2) if len(series) else None,
            }
        except Exception:
            stats[col] = {"error": "non-numeric"}
    return stats


@router.post("/assign")
def assign_columns(payload: AssignmentsPayload):
    """
    Save the mapping of data columns → components.
    This tells the file connector which column feeds which component.
    """
    new_assignments = {}
    for a in payload.assignments:
        new_assignments[a.column] = {
            "component_id": a.component_id,
            "component_name": a.component_name,
            "kpi_name": a.kpi_name,
            "unit": a.unit,
            "rules": a.rules,
        }
    _source_state["assignments"] = new_assignments
    # Persist to disk
    with open(ASSIGNMENTS_FILE, "w") as f:
        json.dump(new_assignments, f, indent=2)

    # Restart/notify the file connector about new assignments
    from connectors.file_connector import get_file_connector
    fc = get_file_connector()
    if fc:
        fc.update_assignments(new_assignments)

    return {"saved": len(new_assignments), "assignments": new_assignments}


@router.get("/schema")
def get_schema():
    return {
        "fileName": _source_state.get("file_name"),
        "columns": _source_state.get("columns", []),
        "timestampColumn": _source_state.get("timestamp_col"),
        "assignments": _source_state.get("assignments", {}),
        "rowCount": _source_state.get("row_count", 0),
        "streaming": _source_state.get("streaming", False),
    }


@router.get("/status")
def get_status():
    from connectors.file_connector import get_file_connector
    fc = get_file_connector()
    return {
        "connected": _source_state.get("file_path") is not None,
        "streaming": _source_state.get("streaming", False),
        "fileName": _source_state.get("file_name"),
        "rowCount": _source_state.get("row_count", 0),
        "assignedColumns": len(_source_state.get("assignments", {})),
        "connectedAt": _source_state.get("connected_at"),
        "connectorRunning": fc._running if fc else False,
    }


@router.delete("")
def disconnect_source():
    _source_state.update({
        "file_path": None, "file_name": None,
        "columns": [], "streaming": False,
    })
    return {"status": "disconnected"}


def get_source_state():
    return _source_state
