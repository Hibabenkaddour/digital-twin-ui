"""Generate realistic airport KPI sample data (24h, every 5 min = 288 rows each)."""
import csv
import random
import os
from datetime import datetime, timedelta
from pathlib import Path

Path("sample_data/airport").mkdir(parents=True, exist_ok=True)
now = datetime(2026, 3, 13, 17, 0, 0)
random.seed(42)


def ts(minutes_ago):
    return (now - timedelta(minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")


def rush(hour):
    """Return True if airport rush hour."""
    return 6 <= hour <= 9 or 11 <= hour <= 13 or 16 <= hour <= 19


# ── 1. Terminal A — Passenger Flow (pax/h) ─────────────────────────────────
with open("sample_data/airport/terminal_passenger_flow.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "value", "unit", "terminal"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i * 5)
        h = dt.hour
        if 6 <= h <= 9:
            base = 1350 + random.gauss(0, 80)
        elif 11 <= h <= 13:
            base = 1100 + random.gauss(0, 60)
        elif 16 <= h <= 19:
            base = 1420 + random.gauss(0, 90)
        elif 0 <= h <= 5:
            base = 120 + random.gauss(0, 20)
        else:
            base = 650 + random.gauss(0, 50)
        # Inject critical spike at 7:30 AM
        if h == 7 and 28 <= dt.minute <= 35:
            base = 1820  # exceeds 1500 critical threshold
        w.writerow([ts(i * 5), round(max(50, base), 1), "pax/h", "Terminal A"])

# ── 2. Security Zone — Wait Time (min) ────────────────────────────────────
with open("sample_data/airport/security_wait_time.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "value", "unit", "zone"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i * 5)
        h = dt.hour
        if 6 <= h <= 9:
            base = 28 + random.gauss(0, 4)
        elif 11 <= h <= 13:
            base = 22 + random.gauss(0, 3)
        elif 16 <= h <= 19:
            base = 35 + random.gauss(0, 5)
        elif 0 <= h <= 5:
            base = 3 + random.gauss(0, 1)
        else:
            base = 12 + random.gauss(0, 3)
        # Critical: wait > 30 min at 7:45 AM
        if h == 7 and 43 <= dt.minute <= 52:
            base = 48
        # Warning at 17:30
        if h == 17 and 28 <= dt.minute <= 38:
            base = 32
        w.writerow([ts(i * 5), round(max(1, base), 1), "min", "Security A"])

# ── 3. Gate Utilization (%) ────────────────────────────────────────────────
gates = ["A1", "A2", "B1", "B3", "C2"]
with open("sample_data/airport/gate_utilization.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "value", "unit", "gate"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i * 5)
        h = dt.hour
        if 6 <= h <= 9:
            base = 88 + random.gauss(0, 5)
        elif 11 <= h <= 13:
            base = 75 + random.gauss(0, 6)
        elif 16 <= h <= 19:
            base = 92 + random.gauss(0, 4)
        elif 0 <= h <= 5:
            base = 10 + random.gauss(0, 3)
        else:
            base = 55 + random.gauss(0, 8)
        gate = gates[i % len(gates)]
        w.writerow([ts(i * 5), round(max(0, min(100, base)), 1), "%", gate])

# ── 4. Baggage Claim — Delay (min) ────────────────────────────────────────
with open("sample_data/airport/baggage_delay.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "value", "unit", "carousel"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i * 5)
        h = dt.hour
        if 6 <= h <= 9:
            base = 14 + random.gauss(0, 3)
        elif 16 <= h <= 19:
            base = 18 + random.gauss(0, 4)
        elif 0 <= h <= 5:
            base = 2 + random.gauss(0, 1)
        else:
            base = 7 + random.gauss(0, 2)
        # Anomaly: belt breakdown at 18:15
        if h == 18 and 13 <= dt.minute <= 22:
            base = 35  # far above 20-min critical threshold
        carousel = f"Carousel {(i % 3) + 1}"
        w.writerow([ts(i * 5), round(max(0, base), 1), "min", carousel])

# ── 5. Check-in Desk — Queue Length (persons) ─────────────────────────────
desks = ["D1", "D2", "D3", "D4"]
with open("sample_data/airport/checkin_queue.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "value", "unit", "desk"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i * 5)
        h = dt.hour
        if 6 <= h <= 9:
            base = 35 + random.gauss(0, 5)
        elif 11 <= h <= 13:
            base = 22 + random.gauss(0, 4)
        elif 16 <= h <= 19:
            base = 40 + random.gauss(0, 6)
        elif 0 <= h <= 5:
            base = 1 + random.gauss(0, 1)
        else:
            base = 10 + random.gauss(0, 3)
        desk = desks[i % len(desks)]
        w.writerow([ts(i * 5), round(max(0, base), 0), "persons", desk])

# ── 6. Runway — Aircraft Movements (per hour) ─────────────────────────────
with open("sample_data/airport/runway_movements.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["timestamp", "value", "unit"])
    for i in range(288, 0, -1):
        dt = now - timedelta(minutes=i * 5)
        h = dt.hour
        if 6 <= h <= 9:
            base = 28 + random.gauss(0, 3)
        elif 11 <= h <= 13:
            base = 22 + random.gauss(0, 2)
        elif 16 <= h <= 19:
            base = 30 + random.gauss(0, 3)
        elif 0 <= h <= 5:
            base = 2 + random.gauss(0, 1)
        else:
            base = 14 + random.gauss(0, 3)
        w.writerow([ts(i * 5), round(max(0, base), 1), "movements/h"])

# ── Summary ────────────────────────────────────────────────────────────────
print("✅ Generated 6 CSV files in sample_data/airport/\n")
total_rows = 0
for fname in sorted(os.listdir("sample_data/airport")):
    fpath = f"sample_data/airport/{fname}"
    with open(fpath) as rf:
        rows = sum(1 for _ in rf) - 1  # minus header
    size = os.path.getsize(fpath)
    total_rows += rows
    print(f"  📊 {fname:<40} {rows} rows · {size:>7,} bytes")
print(f"\n  Total: {total_rows} data points across 24h")
