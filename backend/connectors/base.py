"""
connectors/base.py
Abstract base class for all data source connectors.
Every connector must implement: test_connection, discover_schema, execute_query, preview_data.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SchemaColumn:
    name: str
    data_type: str              # 'string', 'number', 'boolean', 'datetime', 'unknown'
    nullable: bool = True
    alias: str = ""             # business alias set by admin
    tag: str = ""               # 'dimension', 'measure', 'timestamp', 'geo', 'id'
    sample_values: list = field(default_factory=list)


@dataclass
class SchemaTable:
    name: str
    columns: list[SchemaColumn] = field(default_factory=list)
    row_count: int = 0
    enabled: bool = True        # admin toggle


@dataclass
class SchemaInfo:
    tables: list[SchemaTable] = field(default_factory=list)


@dataclass
class ConnectorResult:
    success: bool
    message: str = ""
    data: Any = None
    error: str = ""


class BaseConnector(ABC):
    """Abstract connector — all source types implement this interface."""

    def __init__(self, config: dict):
        self.config = config

    @abstractmethod
    async def test_connection(self) -> ConnectorResult:
        """Validate that the connection config works. Returns success/failure."""
        ...

    @abstractmethod
    async def discover_schema(self) -> SchemaInfo:
        """Auto-detect tables, columns, types from the connected source."""
        ...

    @abstractmethod
    async def preview_data(self, table: str, limit: int = 10) -> list[dict]:
        """Return first N rows from a table for admin preview."""
        ...

    @abstractmethod
    async def execute_query(self, query: str) -> ConnectorResult:
        """Execute a read-only query and return results."""
        ...

    async def close(self):
        """Cleanup resources."""
        pass
