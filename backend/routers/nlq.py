"""
routers/nlq.py
Natural Language Query endpoint — accepts a user question about their dataset,
fetches recent sensor data from PostgreSQL, sends both to Groq LLM (Llama 3.3 70B),
and returns a structured answer with optional chart specifications.
"""
import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_pool

router = APIRouter(prefix="/nlq", tags=["nlq"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

DOMAIN_TABLE = {
    "factory":   "factory_data",
    "airport":   "airport_data",
    "warehouse": "warehouse_data",
}

SYSTEM_PROMPT = """You are an expert analytics AI for a Digital Twin platform.
The user monitors industrial KPIs in real time from a PostgreSQL database.

You will receive:
1. The user's natural language question
2. Recent sensor data rows from their domain (factory / airport / warehouse)
3. Their active KPI assignments (formulas and thresholds)

Your job:
- Answer the question with data-driven insight. Be specific, cite numbers.
- If a chart would help, include a `charts` array in your JSON output.
- Each chart object has: { "title": str, "type": "line"|"bar"|"area", "xKey": str, "series": [{"key": str, "label": str, "color": str}], "data": [...rows] }
- Keep chart data to at most 30 points.
- Colors should be hex like "#4865f2", "#10d98d", "#ef4444", "#f59e0b".

RESPOND ONLY with valid JSON — no markdown, no code fences, no extra text:
{
  "answer": "Your markdown-formatted analysis...",
  "charts": [ ... ]   // optional, omit if no chart is needed
}"""


class AskRequest(BaseModel):
    question: str
    domain: str = "factory"


@router.post("/ask")
async def nlq_ask(req: AskRequest):
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")

    pool = await get_pool()
    table = DOMAIN_TABLE.get(req.domain, "factory_data")

    # ── Fetch recent data (last 60 rows) ────────────────────
    rows = await pool.fetch(
        f"SELECT * FROM {table} ORDER BY id DESC LIMIT 60"
    )

    from decimal import Decimal as _Dec
    from datetime import datetime as _dt, date as _date

    def _clean(v):
        """Convert DB values to JSON-safe types."""
        if isinstance(v, _Dec):
            return float(v)
        if isinstance(v, (_dt, _date)):
            return v.isoformat()
        return v

    data_rows = []
    for r in reversed(rows):
        data_rows.append({k: _clean(v) for k, v in dict(r).items()})

    # ── Fetch KPI assignments ────────────────────────────────
    kpi_rows = await pool.fetch(
        "SELECT component_id, kpi_name, formula, unit, orange_threshold, red_threshold, direction "
        "FROM kpi_assignments WHERE domain=$1", req.domain
    )
    kpis = [dict(k) for k in kpi_rows]
    # Convert thresholds to float for JSON serialization
    for k in kpis:
        for field in ("orange_threshold", "red_threshold"):
            if k[field] is not None:
                k[field] = float(k[field])

    # ── Build prompt ─────────────────────────────────────────
    user_content = (
        f"**Domain:** {req.domain}\n\n"
        f"**Question:** {req.question}\n\n"
        f"**KPI Assignments ({len(kpis)}):**\n```json\n{json.dumps(kpis, indent=1)}\n```\n\n"
        f"**Recent sensor data ({len(data_rows)} rows, most recent last):**\n"
        f"Columns: {list(data_rows[0].keys()) if data_rows else []}\n"
        f"Last 5 rows:\n```json\n{json.dumps(data_rows[-5:], indent=1)}\n```\n\n"
        f"**Summary stats (from all {len(data_rows)} rows):**\n"
    )

    # Compute quick stats for numeric columns
    if data_rows:
        numeric_cols = [k for k, v in data_rows[0].items()
                        if isinstance(v, (int, float)) and k != "id"]
        for col in numeric_cols:
            vals = [r[col] for r in data_rows if isinstance(r.get(col), (int, float))]
            if vals:
                user_content += (
                    f"  {col}: min={min(vals):.2f}  max={max(vals):.2f}  "
                    f"avg={sum(vals)/len(vals):.2f}  latest={vals[-1]:.2f}\n"
                )

    # ── Call Groq LLM ────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": user_content},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 2048,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            body = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e.response.text[:300]}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq request failed: {str(e)}")

    # ── Parse response ───────────────────────────────────────
    raw = body["choices"][0]["message"]["content"]
    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"answer": raw, "charts": []}

    return {
        "answer": result.get("answer", ""),
        "charts": result.get("charts", []),
        "model": GROQ_MODEL,
        "dataRows": len(data_rows),
    }
