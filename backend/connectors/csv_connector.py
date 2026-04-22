"""
connectors/csv_connector.py
CSV/Excel file connector — reads uploaded files, auto-detects schema,
provides preview and query-like filtering.
"""
import csv
import io
import json
from .base import BaseConnector, ConnectorResult, SchemaInfo, SchemaTable, SchemaColumn


def _infer_type(values: list) -> str:
    """Infer column type from a sample of values."""
    nums, dates = 0, 0
    for v in values[:20]:
        if v is None or v == "":
            continue
        try:
            float(v)
            nums += 1
            continue
        except (ValueError, TypeError):
            pass
        if any(sep in str(v) for sep in ["-", "/", "T"]) and len(str(v)) >= 8:
            dates += 1
    total = max(len([x for x in values[:20] if x is not None and x != ""]), 1)
    if nums / total > 0.7:
        return "number"
    if dates / total > 0.7:
        return "datetime"
    return "string"


class CSVConnector(BaseConnector):

    def _parse(self) -> list[dict]:
        """Parse CSV content from the config."""
        content = self.config.get("file_content", "")
        if not content:
            raise ValueError("No file content provided")
        reader = csv.DictReader(io.StringIO(content))
        return list(reader)

    async def test_connection(self) -> ConnectorResult:
        try:
            rows = self._parse()
            return ConnectorResult(
                success=True,
                message=f"Parsed {len(rows)} rows, {len(rows[0].keys()) if rows else 0} columns"
            )
        except Exception as e:
            return ConnectorResult(success=False, error=str(e))

    async def discover_schema(self) -> SchemaInfo:
        rows = self._parse()
        if not rows:
            return SchemaInfo(tables=[SchemaTable(name="uploaded_file")])

        columns = []
        for col_name in rows[0].keys():
            sample = [r.get(col_name) for r in rows[:20]]
            dtype = _infer_type(sample)
            col = SchemaColumn(
                name=col_name,
                data_type=dtype,
                nullable=True,
                tag="measure" if dtype == "number" else "timestamp" if dtype == "datetime" else "dimension",
                sample_values=[str(s) for s in sample[:5] if s],
            )
            columns.append(col)

        table = SchemaTable(
            name=self.config.get("file_name", "uploaded_file").replace(".", "_"),
            columns=columns,
            row_count=len(rows),
        )
        return SchemaInfo(tables=[table])

    async def preview_data(self, table: str, limit: int = 10) -> list[dict]:
        rows = self._parse()
        return rows[:limit]

    async def execute_query(self, query: str) -> ConnectorResult:
        """Basic filtering: not full SQL, just returns all data."""
        rows = self._parse()
        return ConnectorResult(
            success=True,
            data=rows,
            message=f"{len(rows)} rows"
        )
