"""Connector package — DataSource abstraction layer."""
from .base import BaseConnector, ConnectorResult, SchemaInfo
from .postgresql import PostgreSQLConnector
from .csv_connector import CSVConnector

CONNECTOR_REGISTRY = {
    "postgresql": PostgreSQLConnector,
    "csv":        CSVConnector,
}

def get_connector(source_type: str) -> type:
    """Return the connector class for a source type."""
    cls = CONNECTOR_REGISTRY.get(source_type)
    if not cls:
        raise ValueError(f"Unknown connector type: {source_type}")
    return cls
