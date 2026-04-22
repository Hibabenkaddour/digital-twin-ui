"""
routers/datasources.py
CRUD endpoints for data source management:
- POST /datasources/test       — test a connection config
- POST /datasources/create     — save a new data source
- GET  /datasources/           — list all data sources
- GET  /datasources/{id}       — get single data source
- GET  /datasources/{id}/schema — discover schema
- GET  /datasources/{id}/preview/{table} — preview table data
- DELETE /datasources/{id}     — remove a data source
"""
import json
import uuid
from datetime import datetime
from dataclasses import asdict
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from db.connection import get_pool
from connectors import get_connector

router = APIRouter(prefix="/datasources", tags=["datasources"])


# ── Request models ────────────────────────────────────────────
class TestConnectionRequest(BaseModel):
    source_type: str                # 'postgresql', 'mysql', 'csv'
    config: dict                    # connection config

class CreateDataSourceRequest(BaseModel):
    name: str
    source_type: str
    config: dict
    schema_mappings: Optional[dict] = None   # admin field aliases + tags


# ── Test connection ───────────────────────────────────────────
@router.post("/test")
async def test_connection(req: TestConnectionRequest):
    """Test a connection config without saving it."""
    try:
        ConnectorClass = get_connector(req.source_type)
        connector = ConnectorClass(req.config)
        result = await connector.test_connection()
        await connector.close()
        return {"success": result.success, "message": result.message, "error": result.error}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        return {"success": False, "message": "", "error": str(e)}


# ── Discover schema (ad-hoc, before saving) ───────────────────
@router.post("/discover-schema")
async def discover_schema_adhoc(req: TestConnectionRequest):
    """Discover schema from a connection config without saving."""
    try:
        ConnectorClass = get_connector(req.source_type)
        connector = ConnectorClass(req.config)
        schema = await connector.discover_schema()
        await connector.close()
        return {"tables": [asdict(t) for t in schema.tables]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Preview table data (ad-hoc) ──────────────────────────────
@router.post("/preview")
async def preview_adhoc(req: TestConnectionRequest, table: str = "factory_data", limit: int = 10):
    """Preview data from a table using the provided config."""
    try:
        ConnectorClass = get_connector(req.source_type)
        connector = ConnectorClass(req.config)
        rows = await connector.preview_data(table, limit)
        await connector.close()
        return {"rows": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Create (save) a data source ──────────────────────────────
@router.post("/create")
async def create_data_source(req: CreateDataSourceRequest):
    """Save a new data source to the platform database."""
    pool = await get_pool()
    ds_id = f"ds_{uuid.uuid4().hex[:12]}"

    # Test the connection first
    try:
        ConnectorClass = get_connector(req.source_type)
        connector = ConnectorClass(req.config)
        test = await connector.test_connection()
        if not test.success:
            raise HTTPException(status_code=400, detail=f"Connection failed: {test.error}")

        # Discover schema
        schema = await connector.discover_schema()
        await connector.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save to DB
    await pool.execute("""
        INSERT INTO data_sources (id, name, source_type, config, schema_info, schema_mappings, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'connected', $7, $7)
    """,
        ds_id,
        req.name,
        req.source_type,
        json.dumps(req.config),
        json.dumps({"tables": [asdict(t) for t in schema.tables]}),
        json.dumps(req.schema_mappings or {}),
        datetime.utcnow(),
    )

    return {
        "id": ds_id,
        "name": req.name,
        "source_type": req.source_type,
        "status": "connected",
        "tables": len(schema.tables),
    }


# ── List all data sources ────────────────────────────────────
@router.get("/")
async def list_data_sources():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT id, name, source_type, status, schema_info, schema_mappings, created_at, updated_at
        FROM data_sources ORDER BY created_at DESC
    """)
    result = []
    for r in rows:
        schema = json.loads(r["schema_info"]) if r["schema_info"] else {}
        result.append({
            "id": r["id"],
            "name": r["name"],
            "source_type": r["source_type"],
            "status": r["status"],
            "tables": len(schema.get("tables", [])),
            "created_at": r["created_at"].isoformat(),
            "updated_at": r["updated_at"].isoformat(),
        })
    return {"sources": result}


# ── Get single data source ───────────────────────────────────
@router.get("/{ds_id}")
async def get_data_source(ds_id: str):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT * FROM data_sources WHERE id = $1", ds_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data source not found")
    r = dict(row)
    r["config"] = json.loads(r["config"]) if r["config"] else {}
    r["schema_info"] = json.loads(r["schema_info"]) if r["schema_info"] else {}
    r["schema_mappings"] = json.loads(r["schema_mappings"]) if r["schema_mappings"] else {}
    r["created_at"] = r["created_at"].isoformat()
    r["updated_at"] = r["updated_at"].isoformat()
    return r


# ── Get schema for a saved data source ────────────────────────
@router.get("/{ds_id}/schema")
async def get_schema(ds_id: str):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT source_type, config, schema_info FROM data_sources WHERE id = $1", ds_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data source not found")
    return json.loads(row["schema_info"]) if row["schema_info"] else {"tables": []}


# ── Preview table from a saved data source ────────────────────
@router.get("/{ds_id}/preview/{table}")
async def preview_table(ds_id: str, table: str, limit: int = 10):
    pool = await get_pool()
    row = await pool.fetchrow("SELECT source_type, config FROM data_sources WHERE id = $1", ds_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data source not found")

    config = json.loads(row["config"])
    ConnectorClass = get_connector(row["source_type"])
    connector = ConnectorClass(config)
    try:
        rows = await connector.preview_data(table, limit)
        return {"rows": rows, "count": len(rows)}
    finally:
        await connector.close()


# ── Delete data source ────────────────────────────────────────
@router.delete("/{ds_id}")
async def delete_data_source(ds_id: str):
    pool = await get_pool()
    result = await pool.execute("DELETE FROM data_sources WHERE id = $1", ds_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Data source not found")
    return {"deleted": ds_id}


# ── CSV Upload endpoint ──────────────────────────────────────
@router.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    """Upload a CSV file, auto-detect schema, return preview."""
    content = await file.read()
    text = content.decode("utf-8", errors="replace")

    connector = get_connector("csv")({"file_content": text, "file_name": file.filename})
    test_result = await connector.test_connection()
    if not test_result.success:
        raise HTTPException(status_code=400, detail=test_result.error)

    schema = await connector.discover_schema()
    preview = await connector.preview_data("", limit=10)

    return {
        "filename": file.filename,
        "schema": {"tables": [asdict(t) for t in schema.tables]},
        "preview": preview,
        "file_content": text,  # return so frontend can include in create request
    }
