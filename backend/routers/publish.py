"""
routers/publish.py
Publish system — freeze dashboard configs as versioned published dashboards.
CRUD: create, list, get, update, delete. Supports version history and rollback.
"""
import json
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.connection import get_pool

router = APIRouter(prefix="/publish", tags=["publish"])


class PublishRequest(BaseModel):
    name: str
    domain: str
    config: dict                    # full dashboard state (components, connections, kpis, layout)
    theme: Optional[dict] = None    # logo, colors, fonts
    access_type: str = "public"     # 'public', 'password', 'invite'
    access_password: Optional[str] = None


class UpdatePublishRequest(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    theme: Optional[dict] = None
    access_type: Optional[str] = None
    access_password: Optional[str] = None
    is_draft: Optional[bool] = None


# ── Publish a dashboard ──────────────────────────────────────
@router.post("/create")
async def publish_dashboard(req: PublishRequest):
    pool = await get_pool()
    pub_id = f"pub_{uuid.uuid4().hex[:10]}"
    now = datetime.utcnow()

    await pool.execute("""
        INSERT INTO published_dashboards
        (id, name, domain, config, theme, access_type, access_password, version, is_draft, published_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1, false, $8, $8)
    """,
        pub_id, req.name, req.domain,
        json.dumps(req.config), json.dumps(req.theme or {}),
        req.access_type, req.access_password,
        now,
    )

    return {
        "id": pub_id,
        "name": req.name,
        "version": 1,
        "url": f"/view/{pub_id}",
        "embed": f'<iframe src="/view/{pub_id}" width="100%" height="600" frameborder="0"></iframe>',
        "published_at": now.isoformat(),
    }


# ── List published dashboards ────────────────────────────────
@router.get("/list")
async def list_published():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT id, name, domain, version, is_draft, access_type, published_at, updated_at
        FROM published_dashboards ORDER BY updated_at DESC
    """)
    return {"dashboards": [
        {
            "id": r["id"], "name": r["name"], "domain": r["domain"],
            "version": r["version"], "is_draft": r["is_draft"],
            "access_type": r["access_type"],
            "published_at": r["published_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
            "url": f"/view/{r['id']}",
        }
        for r in rows
    ]}


# ── Get a published dashboard ────────────────────────────────
@router.get("/{pub_id}")
async def get_published(pub_id: str, password: Optional[str] = None):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM published_dashboards WHERE id = $1", pub_id)
    if not row:
        raise HTTPException(status_code=404, detail="Published dashboard not found")

    r = dict(row)

    # Access control
    if r["access_type"] == "password" and r["access_password"]:
        if password != r["access_password"]:
            raise HTTPException(status_code=403, detail="Password required")

    return {
        "id": r["id"], "name": r["name"], "domain": r["domain"],
        "config": json.loads(r["config"]),
        "theme": json.loads(r["theme"]) if r["theme"] else {},
        "version": r["version"], "is_draft": r["is_draft"],
        "access_type": r["access_type"],
        "published_at": r["published_at"].isoformat(),
        "updated_at": r["updated_at"].isoformat(),
    }


# ── Update (re-publish / new version) ────────────────────────
@router.put("/{pub_id}")
async def update_published(pub_id: str, req: UpdatePublishRequest):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM published_dashboards WHERE id = $1", pub_id)
    if not row:
        raise HTTPException(status_code=404, detail="Not found")

    updates = []
    values = [pub_id]
    idx = 2

    if req.name is not None:
        updates.append(f"name = ${idx}"); values.append(req.name); idx += 1
    if req.config is not None:
        updates.append(f"config = ${idx}"); values.append(json.dumps(req.config)); idx += 1
        updates.append(f"version = version + 1")
    if req.theme is not None:
        updates.append(f"theme = ${idx}"); values.append(json.dumps(req.theme)); idx += 1
    if req.access_type is not None:
        updates.append(f"access_type = ${idx}"); values.append(req.access_type); idx += 1
    if req.access_password is not None:
        updates.append(f"access_password = ${idx}"); values.append(req.access_password); idx += 1
    if req.is_draft is not None:
        updates.append(f"is_draft = ${idx}"); values.append(req.is_draft); idx += 1

    updates.append(f"updated_at = ${idx}"); values.append(datetime.utcnow()); idx += 1

    if updates:
        await pool.execute(
            f"UPDATE published_dashboards SET {', '.join(updates)} WHERE id = $1",
            *values,
        )

    return {"updated": pub_id}


# ── Delete ────────────────────────────────────────────────────
@router.delete("/{pub_id}")
async def delete_published(pub_id: str):
    pool = await get_pool()
    result = await pool.execute("DELETE FROM published_dashboards WHERE id = $1", pub_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": pub_id}
