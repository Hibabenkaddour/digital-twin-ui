import os
import time
import random
import psycopg2
import json
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/digital_twin")

# ── Column names match the CSV files exactly ──────────────────────────────────
TABLES = {
    "factory_data": [
        "component_id VARCHAR(50)",
        "timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "machine_temperature_c FLOAT",
        "production_throughput_u_h FLOAT",
        "hydraulic_pressure_bar FLOAT",
        "quality_rate_pct FLOAT",
        "machine_downtime_pct FLOAT",
        "belt_speed_m_min FLOAT",
    ],
    "airport_data": [
        "component_id VARCHAR(50)",
        "timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "passenger_flow_pax_h FLOAT",
        "security_wait_min FLOAT",
        "gate_utilization_pct FLOAT",
        "baggage_delay_min FLOAT",
        "checkin_queue_persons FLOAT",
        "runway_movements_per_h FLOAT",
    ],
    "warehouse_data": [
        "component_id VARCHAR(50)",
        "timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        "pick_rate_items_h FLOAT",
        "rack_fill_rate_pct FLOAT",
        "dock_utilization_pct FLOAT",
        "order_cycle_time_min FLOAT",
        "conveyor_throughput_items_min FLOAT",
        "error_rate_pct FLOAT",
    ],
}

def get_db_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        return conn
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        return None

def init_tables(conn):
    cursor = conn.cursor()
    for table_name, columns in TABLES.items():
        # Drop and recreate if schema changed
        cursor.execute(f"DROP TABLE IF EXISTS {table_name};")
        create_sql = f"CREATE TABLE {table_name} ({', '.join(columns)});"
        cursor.execute(create_sql)
        print(f"✅ Created table {table_name}")
    cursor.close()

STATE = {}

def get_initial_state(table_name, component_id):
    if table_name == "factory_data":
        return {
            "machine_temperature_c":      random.uniform(55.0, 75.0),
            "production_throughput_u_h":  random.uniform(80.0, 120.0),
            "hydraulic_pressure_bar":     random.uniform(3.5, 6.0),
            "quality_rate_pct":           random.uniform(88.0, 99.0),
            "machine_downtime_pct":       random.uniform(1.0, 12.0),
            "belt_speed_m_min":           random.uniform(15.0, 35.0),
        }
    elif table_name == "airport_data":
        return {
            "passenger_flow_pax_h":    random.uniform(600.0, 1400.0),
            "security_wait_min":       random.uniform(5.0, 35.0),
            "gate_utilization_pct":    random.uniform(50.0, 95.0),
            "baggage_delay_min":       random.uniform(2.0, 20.0),
            "checkin_queue_persons":   random.uniform(10.0, 80.0),
            "runway_movements_per_h":  random.uniform(10.0, 45.0),
        }
    elif table_name == "warehouse_data":
        return {
            "pick_rate_items_h":              random.uniform(200.0, 450.0),
            "rack_fill_rate_pct":             random.uniform(60.0, 98.0),
            "dock_utilization_pct":           random.uniform(30.0, 90.0),
            "order_cycle_time_min":           random.uniform(20.0, 70.0),
            "conveyor_throughput_items_min":  random.uniform(40.0, 120.0),
            "error_rate_pct":                 random.uniform(0.2, 4.0),
        }
    return {}

def generate_random_data(table_name, component_id):
    if component_id not in STATE:
        STATE[component_id] = get_initial_state(table_name, component_id)

    current = STATE[component_id]

    for k, v in current.items():
        drift = random.uniform(-0.025, 0.03) * v
        if k in ("quality_rate_pct", "gate_utilization_pct", "rack_fill_rate_pct",
                 "dock_utilization_pct", "machine_downtime_pct", "error_rate_pct"):
            current[k] = max(0.0, min(100.0, v + drift))
        elif k == "security_wait_min":
            current[k] = max(1.0, min(60.0, v + drift))
        elif k == "passenger_flow_pax_h":
            current[k] = max(100.0, min(2000.0, v + drift))
        else:
            current[k] = max(0.0, v + drift)

    res = {"component_id": component_id}
    for k, v in current.items():
        res[k] = round(v, 2)
    return res

COMPONENT_IDS = {
    "factory_data":   ["hydraulic_press_1", "conveyor_belt_1", "cnc_machine_1",
                       "assembly_station_1", "quality_control_1"],
    "airport_data":   ["terminal_1", "gate_1", "runway_1",
                       "security_zone_1", "checkin_desk_1", "baggage_claim_1"],
    "warehouse_data": ["storage_rack_1", "picking_zone_1", "reception_dock_1",
                       "shipping_dock_1", "conveyor_1", "sorter_1"],
}

ASSIGNMENTS_FILE = os.path.join(os.path.dirname(__file__), "source_data", "db_assignments.json")

def simulate_stream():
    conn = get_db_connection()
    if not conn:
        print("Waiting 5 seconds and retrying...")
        time.sleep(5)
        conn = get_db_connection()
        if not conn:
            return

    init_tables(conn)
    cursor = conn.cursor()

    print("🚀 Streaming to Postgres every 2 s — Ctrl+C to stop")
    try:
        while True:
            active_domain = "airport"
            active_components = []

            if os.path.exists(ASSIGNMENTS_FILE):
                try:
                    with open(ASSIGNMENTS_FILE) as f:
                        saved = json.load(f)
                        active_domain = saved.get("domain", "airport")
                        assignments = saved.get("assignments", {})
                        active_components = list(set(
                            a.get("component_id")
                            for a in assignments.values()
                            if a.get("component_id")
                        ))
                except Exception as e:
                    print(f"Error reading assignments: {e}")

            table_name = f"{active_domain}_data"
            if not active_components:
                active_components = COMPONENT_IDS.get(table_name, ["generic_1"])

            for comp_id in active_components:
                data = generate_random_data(table_name, comp_id)
                col_str = ", ".join(data.keys())
                placeholders = ", ".join(["%s"] * len(data))
                sql = f"INSERT INTO {table_name} ({col_str}) VALUES ({placeholders})"
                try:
                    cursor.execute(sql, list(data.values()))
                except Exception as e:
                    print(f"Insert error ({table_name}): {e}")

            print(f"[{datetime.now().strftime('%H:%M:%S')}] Inserted {len(active_components)} rows → {table_name}")
            time.sleep(2)

    except KeyboardInterrupt:
        print("\n⏹️  Stopped.")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    simulate_stream()
