"""
connectors/postgresql.py
PostgreSQL connector — connects to any PostgreSQL instance,
discovers schema, previews data, executes read-only queries.
"""
import asyncpg
from .base import BaseConnector, ConnectorResult, SchemaInfo, SchemaTable, SchemaColumn

# Map PostgreSQL type OIDs/names to simple types
PG_TYPE_MAP = {
    "int2": "number", "int4": "number", "int8": "number",
    "float4": "number", "float8": "number", "numeric": "number",
    "bool": "boolean",
    "timestamp": "datetime", "timestamptz": "datetime", "date": "datetime", "time": "datetime",
    "text": "string", "varchar": "string", "char": "string", "name": "string", "bpchar": "string",
    "json": "string", "jsonb": "string", "uuid": "string",
}


class PostgreSQLConnector(BaseConnector):

    def _dsn(self) -> str:
        c = self.config
        host = c.get("host", "localhost")
        port = c.get("port", 5432)
        db   = c.get("database", "")
        user = c.get("username", "")
        pwd  = c.get("password", "")
        ssl  = "require" if c.get("ssl") else "prefer"
        return f"postgresql://{user}:{pwd}@{host}:{port}/{db}?sslmode={ssl}"

    async def test_connection(self) -> ConnectorResult:
        try:
            conn = await asyncpg.connect(self._dsn(), timeout=8)
            version = await conn.fetchval("SELECT version()")
            await conn.close()
            return ConnectorResult(success=True, message=f"Connected — {version[:60]}")
        except Exception as e:
            return ConnectorResult(success=False, error=str(e))

    async def discover_schema(self) -> SchemaInfo:
        conn = await asyncpg.connect(self._dsn(), timeout=8)
        try:
            rows = await conn.fetch("""
                SELECT table_name, column_name, udt_name, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                ORDER BY table_name, ordinal_position
            """)
            tables_map: dict[str, SchemaTable] = {}
            for r in rows:
                tname = r["table_name"]
                if tname not in tables_map:
                    tables_map[tname] = SchemaTable(name=tname)
                col = SchemaColumn(
                    name=r["column_name"],
                    data_type=PG_TYPE_MAP.get(r["udt_name"], "string"),
                    nullable=r["is_nullable"] == "YES",
                )
                # Auto-tag id and timestamp columns
                if col.name == "id" or col.name.endswith("_id"):
                    col.tag = "id"
                elif col.data_type == "datetime":
                    col.tag = "timestamp"
                elif col.data_type == "number":
                    col.tag = "measure"
                else:
                    col.tag = "dimension"
                tables_map[tname].columns.append(col)

            # Get row counts
            for tname, table in tables_map.items():
                try:
                    cnt = await conn.fetchval(f'SELECT COUNT(*) FROM "{tname}"')
                    table.row_count = cnt
                except Exception:
                    pass

            return SchemaInfo(tables=list(tables_map.values()))
        finally:
            await conn.close()

    async def preview_data(self, table: str, limit: int = 10) -> list[dict]:
        conn = await asyncpg.connect(self._dsn(), timeout=8)
        try:
            rows = await conn.fetch(f'SELECT * FROM "{table}" LIMIT {int(limit)}')
            result = []
            for r in rows:
                row = {}
                for k, v in dict(r).items():
                    if hasattr(v, 'isoformat'):
                        row[k] = v.isoformat()
                    elif isinstance(v, (int, float, bool, str)) or v is None:
                        row[k] = v
                    else:
                        row[k] = str(v)
                result.append(row)
            return result
        finally:
            await conn.close()

    async def execute_query(self, query: str) -> ConnectorResult:
        # Safety: only allow SELECT statements
        stripped = query.strip().upper()
        if not stripped.startswith("SELECT"):
            return ConnectorResult(success=False, error="Only SELECT queries are allowed")

        conn = await asyncpg.connect(self._dsn(), timeout=10)
        try:
            rows = await conn.fetch(query)
            data = []
            for r in rows:
                row = {}
                for k, v in dict(r).items():
                    if hasattr(v, 'isoformat'):
                        row[k] = v.isoformat()
                    elif isinstance(v, (int, float, bool, str)) or v is None:
                        row[k] = v
                    else:
                        row[k] = str(v)
                data.append(row)
            return ConnectorResult(success=True, data=data, message=f"{len(data)} rows returned")
        except Exception as e:
            return ConnectorResult(success=False, error=str(e))
        finally:
            await conn.close()
