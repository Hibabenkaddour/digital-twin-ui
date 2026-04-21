"""
routers/layout.py
GET  /layout/state/{id}   → load twin layout JSON
PUT  /layout/state        → save twin layout JSON
POST /layout/prompt       → AI layout generation (mock)
"""
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.connection import get_pool

router = APIRouter(prefix="/layout", tags=["layout"])


@router.get("/state/{layout_id}")
async def get_layout(layout_id: str = "default"):
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT state_json FROM layout_state WHERE id=$1", layout_id
    )
    if not row:
        return {"state": None}
    return {"state": row["state_json"]}


class SaveRequest(BaseModel):
    id:     str = "default"
    domain: str = ""
    name:   str = ""
    state:  dict


@router.put("/state")
async def save_layout(req: SaveRequest):
    pool = await get_pool()
    await pool.execute("""
        INSERT INTO layout_state (id, domain, name, state_json, updated_at)
        VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (id) DO UPDATE SET domain=$2, name=$3, state_json=$4, updated_at=NOW()
    """, req.id, req.domain, req.name, json.dumps(req.state))
    return {"saved": True}


class PromptRequest(BaseModel):
    prompt:       str
    currentState: dict


@router.post("/prompt")
async def layout_prompt(req: PromptRequest):
    """
    Mock AI layout generation.
    In production: call Ollama/OpenAI with the prompt + currentState.
    """
    state = req.currentState
    components = state.get("components", [])
    connections = state.get("connections", [])

    # Simple keyword-based mock response
    explanation = f"Applied layout suggestion: \"{req.prompt}\""
    actions = []

    return {
        "newState":    {**state, "components": components, "connections": connections},
        "actions":     actions,
        "explanation": explanation,
    }
