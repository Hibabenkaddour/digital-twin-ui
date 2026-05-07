from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./digital_twin.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── ORM Models ───────────────────────────────────────────────────────────────

class LayoutStateDB(Base):
    __tablename__ = "layout_states"

    id = Column(String, primary_key=True, default="default")
    user_id = Column(String, nullable=True, index=True)  # Keycloak sub claim
    name = Column(String, default="Digital Twin")
    domain = Column(String, default="factory")
    width = Column(Float, default=60.0)
    length = Column(Float, default=40.0)
    grid_cols = Column(Integer, default=10)
    grid_rows = Column(Integer, default=8)
    components_json = Column(Text, default="[]")
    connections_json = Column(Text, default="[]")
    assignments_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class KpiDataDB(Base):
    __tablename__ = "kpi_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component_id = Column(String, nullable=False, index=True)
    kpi_name = Column(String, nullable=False)
    value = Column(Float)
    unit = Column(String, default="")
    timestamp = Column(DateTime, default=datetime.utcnow)
    source = Column(String, default="manual")  # manual | csv | realtime


class QueryHistoryDB(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    question = Column(Text, nullable=False)
    answer = Column(Text)
    chart_config_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ShareLinkDB(Base):
    __tablename__ = "share_links"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True, index=True)  # Keycloak sub claim — owner
    twin_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def _run_migrations(conn):
    """
    Safe ALTER TABLE migrations — adds new columns to existing tables without
    dropping data. PostgreSQL supports 'ADD COLUMN IF NOT EXISTS'; for SQLite
    we catch the OperationalError if the column already exists.
    """
    is_postgres = "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL

    migrations = [
        ("layout_states",  "user_id", "VARCHAR"),
        ("share_links",    "user_id", "VARCHAR"),
    ]

    for table, column, col_type in migrations:
        try:
            if is_postgres:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type};"
                ))
            else:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN {column} {col_type};"
                ))
            logger.info(f"Migration OK: {table}.{column}")
        except Exception as e:
            # Column already exists in SQLite — harmless
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                logger.debug(f"Migration skip (already exists): {table}.{column}")
            else:
                logger.error(f"Migration error on {table}.{column}: {e}")


def create_tables():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        _run_migrations(conn)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
