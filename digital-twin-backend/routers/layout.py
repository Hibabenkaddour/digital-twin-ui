from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import crud
from models.schemas import (
    LayoutPromptRequest, LayoutPromptResponse,
    LayoutStateSchema
)
from agents.layout_agent import run_layout_agent

router = APIRouter(prefix="/layout", tags=["Layout"])


@router.post("/prompt", response_model=LayoutPromptResponse)
async def layout_from_prompt(request: LayoutPromptRequest, db: Session = Depends(get_db)):
    """Convert a natural language prompt into layout actions and return the new state."""
    try:
        result = await run_layout_agent(request.prompt, request.currentState)
        # Persist new state to DB
        crud.save_layout(db, result.newState)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/state/{layout_id}", response_model=LayoutStateSchema)
def get_layout_state(layout_id: str = "default", db: Session = Depends(get_db)):
    """Get saved layout state from DB."""
    db_layout = crud.get_layout(db, layout_id)
    if not db_layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return crud.layout_db_to_schema(db_layout)


@router.get("/state", response_model=LayoutStateSchema)
def get_default_layout(db: Session = Depends(get_db)):
    """Get default layout state."""
    db_layout = crud.get_layout(db, "default")
    if not db_layout:
        return LayoutStateSchema()
    return crud.layout_db_to_schema(db_layout)


@router.put("/state", response_model=LayoutStateSchema)
def save_layout_state(state: LayoutStateSchema, db: Session = Depends(get_db)):
    """Save/update layout state."""
    db_layout = crud.save_layout(db, state)
    return crud.layout_db_to_schema(db_layout)
