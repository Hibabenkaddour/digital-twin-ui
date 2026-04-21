from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/digital_twin")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ─── ORM Models ───────────────────────────────────────────────────────────────

class LayoutStateDB(Base):
    __tablename__ = "layout_states"

    id = Column(String, primary_key=True, default="default")
    name = Column(String, default="Digital Twin")
    domain = Column(String, default="factory")
    grid_cols = Column(Integer, default=10)
    grid_rows = Column(Integer, default=8)
    components_json = Column(Text, default="[]")
    connections_json = Column(Text, default="[]")
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


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
