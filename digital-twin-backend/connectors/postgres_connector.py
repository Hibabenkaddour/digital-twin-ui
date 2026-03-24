"""
Postgres Connector — polls the target PostgreSQL table for new sensor data,
evaluates user-defined math formulas, applies thresholds, and emits KPIs.
"""
from __future__ import annotations
import asyncio
import logging
import os
from datetime import datetime, timezone
import psycopg2
from psycopg2.extras import RealDictCursor
from simpleeval import simple_eval

from connectors.base import BaseConnector, KpiReading

logger = logging.getLogger(__name__)

_instance = None

def get_postgres_connector():
    return _instance

class PostgresConnector(BaseConnector):
    name = "postgres"

    def __init__(self, config: dict):
        super().__init__(config)
        global _instance
        _instance = self
        
        self.db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/digital_twin")
        self.assignments = config.get("assignments", {})
        self.domain = config.get("domain", "factory") 
        self.poll_interval = float(config.get("poll_interval", 2.0))
        self.last_timestamps = {}  # Keep track of last seen row per component

    def update_assignments(self, assignments: dict, domain: str):
        self.assignments = assignments
        self.domain = domain
        logger.info(f"PostgresConnector: updated for domain {domain} with {len(assignments)} KPIs")

    def get_table_name(self):
        return f"{self.domain}_data"

    def _get_connection(self):
        try:
            return psycopg2.connect(self.db_url)
        except Exception as e:
            logger.error(f"PostgresConnector failed to connect: {e}")
            return None

    def _evaluate_formula(self, formula: str, row: dict) -> float:
        try:
            # simple_eval securely evaluations math strings like "temp_engine + 5" substituting vars from row
            val = simple_eval(formula, names=row)
            return float(val)
        except Exception as e:
            logger.warning(f"Formula evaluation failed for '{formula}': {e}")
            return 0.0

    async def _run_loop(self):
        logger.info(f"PostgresConnector: Polling {self.db_url} every {self.poll_interval}s")
        outage_logged = False
        
        while self._running:
            await asyncio.sleep(self.poll_interval)
            
            if not self.assignments:
                continue

            conn = self._get_connection()
            if not conn:
                if not outage_logged:
                    logger.warning("PostgresConnector: Waiting for DB connection...")
                    outage_logged = True
                continue
                
            outage_logged = False

            try:
                cursor = conn.cursor(cursor_factory=RealDictCursor)
                table_name = self.get_table_name()
                
                # Fetch latest row for EACH mapped component uniquely
                components_needed = set(kpi.get('component_id') for kpi in self.assignments.values() if kpi.get('component_id'))
                
                for comp_id in components_needed:
                    query = f"SELECT * FROM {table_name} WHERE component_id = %s"
                    params = [comp_id]
                    
                    last_ts = self.last_timestamps.get(comp_id)
                    if last_ts:
                        query += " AND timestamp > %s"
                        params.append(last_ts)
                        
                    query += " ORDER BY timestamp DESC LIMIT 1"
                    
                    cursor.execute(query, tuple(params))
                    row = cursor.fetchone()
                    
                    if row:
                        self.last_timestamps[comp_id] = row.get('timestamp')
                        
                        # Process assigned KPIs for THIS specific component
                        comp_kpis = {k: v for k, v in self.assignments.items() if v.get('component_id') == comp_id}
                        
                        for kpi_id, kpi_config in comp_kpis.items():
                            formula = kpi_config.get("formula", "")
                            value = self._evaluate_formula(formula, dict(row))
                            rules = kpi_config.get("rules", {})
                            status = self.compute_status(value, rules)
                            
                            ts = row.get("timestamp") or datetime.now(timezone.utc)
                            if ts.tzinfo is None:
                                ts = ts.replace(tzinfo=timezone.utc)
                                
                            reading = KpiReading(
                                component_id=comp_id,
                                kpi_name=kpi_config.get("kpi_name", "KPI"),
                                value=round(value, 3),
                                unit=kpi_config.get("unit", ""),
                                timestamp=ts,
                                source="postgres",
                                status=status,
                                meta={
                                    "formula": formula,
                                    "interaction": kpi_config.get("interaction", "pulse"),
                                    "rules": rules
                                }
                            )
                            await self.emit(reading)
                            
            except Exception as e:
                logger.error(f"PostgresConnector poll error: {e}")
            finally:
                if cursor: cursor.close()
                conn.close()
