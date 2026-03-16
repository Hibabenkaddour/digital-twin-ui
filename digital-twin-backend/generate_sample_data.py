"""
Generate one combined sample data file per domain — all KPIs in a single CSV.
Each row = one timestamp, each column = one KPI metric.
"""
import csv, random, math, os
from datetime import datetime, timedelta
from pathlib import Path

Path("sample_data").mkdir(exist_ok=True)
now = datetime(2026, 3, 13, 23, 0, 0)
random.seed(42)

def ts(minutes_ago):
    return (now - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")

def rush(h):
    return max(math.exp(-((h-7.5)**2)/3), math.exp(-((h-12)**2)/3), math.exp(-((h-17.5)**2)/3))

# ── AIRPORT ──────────────────────────────────────────────────────────────────
with open("sample_data/airport_data.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","passenger_flow_pax_h","security_wait_min",
                "gate_utilization_pct","baggage_delay_min",
                "checkin_queue_persons","runway_movements_per_h"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i*5)
        h, rf = dt.hour, rush(dt.hour + dt.minute/60)
        spike = (h==7 and 28<=dt.minute<=35)
        w.writerow([ts(i*5),
            round(max(80, 200 + rf*1600 + random.gauss(0,70) + (850 if spike else 0)),1),
            round(max(1, 4  + rf*32   + random.gauss(0,3)  + (16 if spike else 0)),1),
            round(max(0,min(100, 20 + rf*75 + random.gauss(0,5))),1),
            round(max(0, 2  + rf*18   + random.gauss(0,2)  + (14 if h==18 and 13<=dt.minute<=22 else 0)),1),
            round(max(0, 2  + rf*40   + random.gauss(0,4)),0),
            round(max(0, 3  + rf*28   + random.gauss(0,2)),1),
        ])
print("✅ sample_data/airport_data.csv — 288 rows, 6 KPI columns")

# ── FACTORY ───────────────────────────────────────────────────────────────────
with open("sample_data/factory_data.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","machine_temperature_c","production_throughput_u_h",
                "hydraulic_pressure_bar","quality_rate_pct",
                "machine_downtime_pct","belt_speed_m_min"])
    temp = 55.0; pressure = 145.0; throughput = 92.0; quality = 97.0
    for i in range(288, 0, -1):
        temp     = max(40, min(120, temp     + random.gauss(0,1.2)))
        pressure = max(80, min(220, pressure + random.gauss(0,3)))
        throughput = max(0, min(180, throughput + random.gauss(0,2)))
        quality  = max(0, min(100, quality + random.gauss(0,0.3)))
        downtime = max(0, min(60, abs(random.gauss(5, 3))))
        belt     = max(0, min(60, 25 + random.gauss(0,2)))
        # Inject anomaly at i=120
        if 118 <= i <= 125: temp += 25; pressure += 35
        w.writerow([ts(i*5),
            round(temp,1), round(throughput,1), round(pressure,1),
            round(quality,1), round(downtime,1), round(belt,1)])
print("✅ sample_data/factory_data.csv — 288 rows, 6 KPI columns")

# ── WAREHOUSE ─────────────────────────────────────────────────────────────────
with open("sample_data/warehouse_data.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp","pick_rate_items_h","rack_fill_rate_pct",
                "dock_utilization_pct","order_cycle_time_min",
                "conveyor_throughput_items_min","error_rate_pct"])
    pick=340.0; fill=75.0; dock=60.0; cycle=28.0; conv=45.0; err=1.2
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i*5)
        shift = 1 if 6 <= dt.hour <= 22 else 0.3
        pick  = max(0, min(600, pick  + random.gauss(0,8)*shift))
        fill  = max(0, min(100, fill  + random.gauss(0,0.5)))
        dock  = max(0, min(100, dock  + random.gauss(0,4)*shift))
        cycle = max(5, min(120, cycle + random.gauss(0,1.5)))
        conv  = max(0, min(100, conv  + random.gauss(0,3)*shift))
        err   = max(0, min(20,  err   + random.gauss(0,0.2)))
        # Slowdown at i=60
        if 58 <= i <= 65: pick -= 90; cycle += 20
        w.writerow([ts(i*5),
            round(pick,1), round(fill,1), round(dock,1),
            round(cycle,1), round(conv,1), round(err,2)])
print("✅ sample_data/warehouse_data.csv — 288 rows, 6 KPI columns")

print("\nColumn guide:")
print("  Airport  : passenger_flow_pax_h, security_wait_min, gate_utilization_pct, baggage_delay_min, checkin_queue_persons, runway_movements_per_h")
print("  Factory  : machine_temperature_c, production_throughput_u_h, hydraulic_pressure_bar, quality_rate_pct, machine_downtime_pct, belt_speed_m_min")
print("  Warehouse: pick_rate_items_h, rack_fill_rate_pct, dock_utilization_pct, order_cycle_time_min, conveyor_throughput_items_min, error_rate_pct")
