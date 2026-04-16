import asyncio
import random
import logging
from datetime import datetime, timezone
from psycopg2.extras import execute_values
from db.database import SessionLocal

logger = logging.getLogger(__name__)
# --- Initial State configurations ---
def get_initial_state(domain):
    if domain == "factory":
        return {
            "temp_engine": random.uniform(50.0, 70.0),
            "pressure_bar": random.uniform(3.0, 5.0),
            "vibration_freq": random.uniform(40.0, 60.0),
            "energy_in": random.uniform(80.0, 100.0),
            "energy_out": random.uniform(60.0, 80.0),
            "quality_score": random.uniform(95.0, 99.0),
            "defect_rate": random.uniform(0.5, 1.0),
        }
    elif domain == "airport":
        return {
            "passenger_count": random.randint(100, 200),
            "wait_time_minutes": random.uniform(5.0, 15.0),
            "processing_rate": random.uniform(40.0, 60.0),
            "baggage_throughput": random.randint(300, 500),
            "security_score": random.uniform(85.0, 95.0),
            "flight_delay_minutes": random.uniform(2.0, 10.0),
        }
    elif domain == "warehouse":
        return {
            "inventory_level": random.randint(4000, 6000),
            "pick_rate": random.uniform(150.0, 250.0),
            "cycle_time_seconds": random.uniform(100.0, 150.0),
            "conveyor_speed": random.uniform(1.0, 2.0),
            "forklift_battery": random.uniform(80.0, 100.0),
            "error_rate": random.uniform(0.5, 1.0),
        }
    return {}

STATE = {}

def generate_random_data(domain, component_id):
    if component_id not in STATE:
        STATE[component_id] = get_initial_state(domain)
    
    current = STATE[component_id]
    
    for k, v in current.items():
        drift = random.uniform(-0.02, 0.025) * v
        if "rate" in k or k == "quality_score":
            current[k] = max(0.0, min(100.0, v + drift))
        elif k in ["passenger_count", "inventory_level"]:
            current[k] = max(0, int(v + drift * 10))
        elif k == "forklift_battery":
            current[k] = max(0.0, min(100.0, v - random.uniform(0.1, 0.5)))
        else:
            current[k] = max(0.0, v + drift)
            
    res = {"component_id": component_id}
    for k, v in current.items():
        res[k] = round(v, 2) if isinstance(v, float) else v
    return res

async def simulator_loop():
    from routers.data_source import get_source_state
    import psycopg2
    import os
    
    logger.info("🚀 Production Data Simulator started.")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.warning("No DATABASE_URL found, simulator won't stream.")
        return

    while True:
        await asyncio.sleep(2.0)
        state = get_source_state()
        domain = state.get("domain", "factory")
        assignments = state.get("assignments", {})
        
        active_components = list(set(a.get("component_id") for a in assignments.values() if a.get("component_id")))
        
        if not active_components:
            continue
            
        table_name = f"{domain}_data"
        try:
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            cursor = conn.cursor()
            
            for comp_id in active_components:
                data = generate_random_data(domain, comp_id)
                columns = list(data.keys())
                values = list(data.values())
                
                col_str = ", ".join(columns)
                val_placeholders = ", ".join(["%s"] * len(values))
                
                sql = f"INSERT INTO {table_name} ({col_str}) VALUES ({val_placeholders})"
                cursor.execute(sql, values)
            
            cursor.close()
            conn.close()
        except Exception as e:
            logger.error(f"Simulator DB error: {e}")
