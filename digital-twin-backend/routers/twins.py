import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db import crud
from models.schemas import LayoutStateSchema, TwinSummary
from routers.auth import get_current_user

router = APIRouter(prefix="/twins", tags=["Twins"])


def _to_summary(db_layout) -> TwinSummary:
    components = json.loads(db_layout.components_json or "[]")
    connections = json.loads(db_layout.connections_json or "[]")
    return TwinSummary(
        id=db_layout.id,
        name=db_layout.name,
        domain=db_layout.domain,
        width=getattr(db_layout, "width", 60.0) or 60.0,
        length=getattr(db_layout, "length", 40.0) or 40.0,
        gridCols=db_layout.grid_cols,
        gridRows=db_layout.grid_rows,
        componentCount=len(components),
        connectionCount=len(connections),
        createdAt=db_layout.created_at,
        updatedAt=db_layout.updated_at,
    )


@router.get("", response_model=list[TwinSummary])
def list_twins(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """List only the digital twins owned by the authenticated user."""
    twins = crud.list_twins(db, user_id=user_id)
    return [_to_summary(t) for t in twins]


@router.get("/{twin_id}", response_model=LayoutStateSchema)
def get_twin(
    twin_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Load full state of a digital twin — only if owned by the authenticated user."""
    db_layout = crud.get_layout(db, twin_id, user_id=user_id)
    if not db_layout:
        raise HTTPException(status_code=404, detail="Twin not found")
    schema = crud.layout_db_to_schema(db_layout)

    # Sync backend data stream to use this Twin's KPIs
    try:
        from routers.data_source import apply_assignments_sync
        if schema.kpiAssignments:
            apply_assignments_sync(schema.domain, schema.kpiAssignments)
    except Exception as e:
        print(f"Failed to sync KPIs on twin load: {e}")

    return schema


@router.put("/{twin_id}", response_model=TwinSummary)
def save_twin(
    twin_id: str,
    state: LayoutStateSchema,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Create or update a digital twin — scoped to the authenticated user."""
    state.id = twin_id
    db_layout = crud.save_layout(db, state, user_id=user_id)
    return _to_summary(db_layout)


@router.delete("/{twin_id}")
def delete_twin(
    twin_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Delete a digital twin — only if owned by the authenticated user."""
    deleted = crud.delete_twin(db, twin_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Twin not found")
    return {"deleted": twin_id}
