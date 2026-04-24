"""
routers/source.py
GET  /source/schema?domain=   → column names for KPI builder
POST /source/assign           → save KPI formula assignments
POST /source/propose_kpis     → mock AI KPI suggestions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_pool
from utils.formula import validate_formula

router = APIRouter(prefix="/source", tags=["source"])

DOMAIN_COLUMNS = {
    "factory":   ["temp_1","temp_2","pressure","energy_kwh","vibration","speed_rpm","throughput"],
    "airport":   ["passenger_count","gate_open","delay_min","runway_free","checkin_queue","baggage_wait","fuel_level"],
    "warehouse": ["stock_level","pick_rate","dock_util","order_backlog","conveyor_speed","sorter_error_rate","temp_zone"],
}

AI_KPI_SUGGESTIONS = {
    "factory": [
        {"kpi_name":"Avg Temperature","formula":"(temp_1 + temp_2) / 2","unit":"°C","orange":60,"red":80,"direction":"asc","interaction":"pulse"},
        {"kpi_name":"Energy per Unit","formula":"energy_kwh / throughput","unit":"kWh/%","orange":0.8,"red":1.5,"direction":"asc","interaction":"glow"},
        {"kpi_name":"Vibration Index","formula":"vibration","unit":"mm/s","orange":3,"red":6,"direction":"asc","interaction":"pulse"},
    ],
    "airport": [
        {"kpi_name":"Delay Score","formula":"delay_min","unit":"min","orange":10,"red":30,"direction":"asc","interaction":"pulse"},
        {"kpi_name":"Queue Pressure","formula":"checkin_queue","unit":"pax","orange":50,"red":100,"direction":"asc","interaction":"pulse"},
        {"kpi_name":"Fuel Level","formula":"fuel_level","unit":"%","orange":40,"red":20,"direction":"desc","interaction":"transition"},
    ],
    "warehouse": [
        {"kpi_name":"Stock Criticality","formula":"stock_level","unit":"%","orange":40,"red":20,"direction":"desc","interaction":"transition"},
        {"kpi_name":"Sorter Error Rate","formula":"sorter_error_rate","unit":"%","orange":1,"red":5,"direction":"asc","interaction":"pulse"},
        {"kpi_name":"Dock Utilisation","formula":"dock_util","unit":"%","orange":80,"red":90,"direction":"asc","interaction":"glow"},
    ],
}


@router.get("/schema")
async def get_schema(domain: str = "factory"):
    pool = await get_pool()
    # Return DB-verified assignments alongside column list
    rows = await pool.fetch(
        "SELECT component_id, kpi_name, formula, unit, orange_threshold, red_threshold, direction, interaction "
        "FROM kpi_assignments WHERE domain=$1", domain
    )
    assignments = {}
    for r in rows:
        assignments[f"{r['component_id']}_{r['kpi_name']}"] = dict(r)

    return {
        "columns": DOMAIN_COLUMNS.get(domain, []),
        "assignments": assignments,
    }


class KpiAssignment(BaseModel):
    kpi_id:       str
    component_id: str
    kpi_name:     str
    formula:      str
    unit:         str = ""
    rules:        dict = {}
    interaction:  str = "pulse"


class AssignRequest(BaseModel):
    domain:      str
    assignments: list[KpiAssignment]


@router.post("/assign")
async def assign_kpis(req: AssignRequest):
    allowed_columns = DOMAIN_COLUMNS.get(req.domain, [])
    if not allowed_columns:
        raise HTTPException(status_code=400, detail=f"Domaine inconnu : {req.domain}")

    for a in req.assignments:
        valid, error = validate_formula(a.formula, allowed_columns)
        if not valid:
            raise HTTPException(
                status_code=422,
                detail=f"Formule invalide pour '{a.kpi_name}' : {error}"
            )

    pool = await get_pool()
    for a in req.assignments:
        orange = a.rules.get("orange", [None])[0] if a.rules.get("orange") else None
        red    = a.rules.get("red",    [None])[0] if a.rules.get("red")    else None
        direction = a.rules.get("direction", "asc")
        await pool.execute("""
            INSERT INTO kpi_assignments
              (domain, component_id, kpi_name, formula, unit, orange_threshold, red_threshold, direction, interaction)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            ON CONFLICT (domain, component_id, kpi_name)
            DO UPDATE SET formula=$4, unit=$5, orange_threshold=$6, red_threshold=$7, direction=$8, interaction=$9
        """, req.domain, a.component_id, a.kpi_name, a.formula, a.unit,
            float(orange) if orange is not None else None,
            float(red)    if red    is not None else None,
            direction, a.interaction)
    return {"saved": len(req.assignments)}


class ProposeRequest(BaseModel):
    domain:  str
    columns: list[str]


@router.post("/propose_kpis")
async def propose_kpis(req: ProposeRequest):
    suggestions = AI_KPI_SUGGESTIONS.get(req.domain, [])
    return {"kpis": suggestions}
