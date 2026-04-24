"""
routers/kpis.py
GET /kpis/summary              → counts by status
GET /kpis/{component_id}       → time-series history for charts
GET /analytics/chart-data      → all columns time-series for a domain (for Charts tab)
"""
import logging
import numexpr
import numpy
from fastapi import APIRouter, Query, HTTPException
from db.connection import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(tags=["kpis"])

DOMAIN_TABLE = {
    "factory":   "factory_data",
    "airport":   "airport_data",
    "warehouse": "warehouse_data",
}


def _get_table(domain: str) -> str:
    """Résoud le nom de table à partir du domaine. Lève 400 si domaine inconnu."""
    table = DOMAIN_TABLE.get(domain)
    if table is None:
        raise HTTPException(
            status_code=400,
            detail=f"Domaine invalide '{domain}'. Valeurs acceptées : {list(DOMAIN_TABLE)}"
        )
    return table


@router.get("/kpis/summary")
async def kpi_summary():
    """Return total row counts per domain as a simple health check."""
    pool = await get_pool()
    result = {}
    for domain, table in DOMAIN_TABLE.items():
        # table provient exclusivement du dict DOMAIN_TABLE (valeurs fixes)
        row = await pool.fetchrow(f"SELECT COUNT(*) as cnt FROM {table}")
        result[domain] = row["cnt"] if row else 0
    return result


@router.get("/kpis/{component_id}")
async def get_component_kpis(
    component_id: str,
    domain: str = Query("factory"),
    kpi_name: str = Query(None),
    limit: int = Query(120, ge=1, le=500),
):
    """
    Returns evaluated KPI history for a specific component.
    Works by fetching sensor rows then evaluating stored formulas.
    """
    pool = await get_pool()
    table = _get_table(domain)

    # Get KPI formulas for this component
    q = "SELECT * FROM kpi_assignments WHERE domain=$1 AND component_id=$2"
    args = [domain, component_id]
    if kpi_name:
        q += " AND kpi_name=$3"
        args.append(kpi_name)
    kpi_rows = await pool.fetch(q, *args)
    kpis = [dict(r) for r in kpi_rows]
    if not kpis:
        return {"data": [], "kpis": []}

    # Fetch sensor history — table name from whitelist, limit parameterized
    rows = await pool.fetch(
        f"SELECT * FROM {table} ORDER BY id DESC LIMIT $1", limit
    )

    def safe_eval(formula, row_dict):
        try:
            local_vars = {k: float(v) for k, v in row_dict.items() if v is not None and isinstance(v, (int, float))}
            result = numexpr.evaluate(formula, local_dict=local_vars)
            return float(numpy.atleast_1d(result)[0])
        except Exception:
            return 0.0

    def classify(val, orange, red, direction):
        if direction == "asc":
            if red is not None and val >= float(red): return "red"
            if orange is not None and val >= float(orange): return "orange"
        else:
            if red is not None and val <= float(red): return "red"
            if orange is not None and val <= float(orange): return "orange"
        return "green"

    series = []
    for row in reversed(rows):
        rd = dict(row)
        point = {"timestamp": rd["recorded_at"].isoformat(), "flowStatus": rd.get("flow_status","green")}
        for kpi in kpis:
            val = safe_eval(kpi["formula"], rd)
            status = classify(val, kpi["orange_threshold"], kpi["red_threshold"], kpi["direction"])
            point[kpi["kpi_name"]] = round(val, 2)
            point[f"{kpi['kpi_name']}_status"] = status
        series.append(point)

    return {
        "data": series,
        "kpis": [{"name": k["kpi_name"], "unit": k["unit"], "orange": float(k["orange_threshold"] or 0), "red": float(k["red_threshold"] or 0), "direction": k["direction"]} for k in kpis]
    }


@router.get("/analytics/chart-data")
async def chart_data(
    domain: str = Query("factory"),
    limit: int = Query(60, ge=1, le=500),
):
    """
    Returns raw sensor columns for the Charts tab.
    Frontend can render any column as a line chart.
    """
    pool = await get_pool()
    table = _get_table(domain)
    rows = await pool.fetch(
        f"SELECT * FROM {table} ORDER BY id DESC LIMIT $1", limit
    )
    data = []
    for row in reversed(rows):
        rd = dict(row)
        rd["recorded_at"] = rd["recorded_at"].isoformat()
        data.append(rd)
    return {"domain": domain, "data": data}
