"""
simulator/data_gen.py
Inserts synthetic sensor rows every 2 s for all 3 domains.
Cycles through: Normal → Warning → Critical → Recovery
Flow status cycles independently for connection animations.
"""
import asyncio
import math
import random
import time
from db.connection import get_pool

# ─── Phase timing (seconds per phase) ────────────────────────
PHASES = [
    {"name": "normal",   "duration": 30},
    {"name": "warning",  "duration": 15},
    {"name": "critical", "duration": 10},
    {"name": "recovery", "duration": 12},
]
FLOW_PHASES = [
    {"status": "green",  "duration": 25},
    {"status": "orange", "duration": 12},
    {"status": "red",    "duration": 8},
]

_start_time = time.time()


def _elapsed() -> float:
    return time.time() - _start_time


def _current_phase(phases: list[dict]) -> str:
    total = sum(p["duration"] for p in phases)
    t = _elapsed() % total
    acc = 0
    for p in phases:
        acc += p["duration"]
        if t < acc:
            return p.get("name") or p.get("status")
    return phases[-1].get("name") or phases[-1].get("status")


def _noise(val: float, pct: float = 0.05) -> float:
    """Add ±pct white noise."""
    return val * (1 + random.uniform(-pct, pct))


# ─── Factory ─────────────────────────────────────────────────
def factory_row(phase: str, flow: str) -> dict:
    t = _elapsed()
    if phase == "normal":
        temp_1      = _noise(35 + 10 * math.sin(t / 20))
        temp_2      = _noise(38 + 8  * math.sin(t / 25 + 1))
        pressure    = _noise(2.5)
        energy_kwh  = _noise(25)
        vibration   = _noise(1.5)
        speed_rpm   = _noise(1200)
        throughput  = _noise(82)
    elif phase == "warning":
        temp_1      = _noise(65 + 5 * math.sin(t / 10))
        temp_2      = _noise(62)
        pressure    = _noise(4.3)
        energy_kwh  = _noise(55)
        vibration   = _noise(4.2)
        speed_rpm   = _noise(2200)
        throughput  = _noise(55)
    elif phase == "critical":
        temp_1      = _noise(87)
        temp_2      = _noise(84)
        pressure    = _noise(5.6)
        energy_kwh  = _noise(82)
        vibration   = _noise(7.1)
        speed_rpm   = _noise(3200)
        throughput  = _noise(22)
    else:  # recovery
        frac = ((_elapsed() % 12) / 12)
        temp_1      = _noise(87 - 50 * frac)
        temp_2      = _noise(84 - 44 * frac)
        pressure    = _noise(5.6 - 3.0 * frac)
        energy_kwh  = _noise(82 - 55 * frac)
        vibration   = _noise(7.1 - 5.5 * frac)
        speed_rpm   = _noise(3200 - 1950 * frac)
        throughput  = _noise(22 + 55 * frac)

    return dict(
        temp_1=round(max(15, temp_1), 2),
        temp_2=round(max(15, temp_2), 2),
        pressure=round(max(0.5, pressure), 2),
        energy_kwh=round(max(5, energy_kwh), 3),
        vibration=round(max(0, vibration), 3),
        speed_rpm=round(max(100, speed_rpm), 2),
        throughput=round(min(100, max(0, throughput)), 2),
        flow_status=flow,
    )


# ─── Airport ─────────────────────────────────────────────────
def airport_row(phase: str, flow: str) -> dict:
    if phase == "normal":
        passenger_count = int(_noise(120, 0.15))
        gate_open       = 1
        delay_min       = _noise(5)
        runway_free     = 1
        checkin_queue   = int(_noise(30, 0.2))
        baggage_wait    = _noise(12)
        fuel_level      = _noise(75)
    elif phase == "warning":
        passenger_count = int(_noise(220, 0.1))
        gate_open       = 1
        delay_min       = _noise(20)
        runway_free     = 1
        checkin_queue   = int(_noise(75, 0.15))
        baggage_wait    = _noise(30)
        fuel_level      = _noise(30)
    elif phase == "critical":
        passenger_count = int(_noise(80, 0.1))
        gate_open       = 0
        delay_min       = _noise(45)
        runway_free     = 0
        checkin_queue   = int(_noise(140, 0.1))
        baggage_wait    = _noise(55)
        fuel_level      = _noise(12)
    else:
        frac = (_elapsed() % 12) / 12
        passenger_count = int(_noise(80 + 40 * frac))
        gate_open       = 1
        delay_min       = _noise(45 - 40 * frac)
        runway_free     = 1
        checkin_queue   = int(_noise(140 - 110 * frac))
        baggage_wait    = _noise(55 - 43 * frac)
        fuel_level      = _noise(12 + 63 * frac)

    return dict(
        passenger_count=max(0, passenger_count),
        gate_open=gate_open,
        delay_min=round(max(0, delay_min), 1),
        runway_free=runway_free,
        checkin_queue=max(0, checkin_queue),
        baggage_wait=round(max(0, baggage_wait), 1),
        fuel_level=round(min(100, max(0, fuel_level)), 2),
        flow_status=flow,
    )


# ─── Warehouse ───────────────────────────────────────────────
def warehouse_row(phase: str, flow: str) -> dict:
    if phase == "normal":
        stock_level       = _noise(72)
        pick_rate         = _noise(320)
        dock_util         = _noise(55)
        order_backlog     = int(_noise(30, 0.2))
        conveyor_speed    = _noise(1.5)
        sorter_error_rate = _noise(0.3, 0.2)
        temp_zone         = _noise(4.5)
    elif phase == "warning":
        stock_level       = _noise(32)
        pick_rate         = _noise(155)
        dock_util         = _noise(83)
        order_backlog     = int(_noise(70, 0.15))
        conveyor_speed    = _noise(0.38)
        sorter_error_rate = _noise(3.1, 0.15)
        temp_zone         = _noise(7.8)
    elif phase == "critical":
        stock_level       = _noise(12)
        pick_rate         = _noise(65)
        dock_util         = _noise(95)
        order_backlog     = int(_noise(130, 0.1))
        conveyor_speed    = _noise(0.12)
        sorter_error_rate = _noise(7.5, 0.1)
        temp_zone         = _noise(10.5)
    else:
        frac = (_elapsed() % 12) / 12
        stock_level       = _noise(12 + 60 * frac)
        pick_rate         = _noise(65 + 255 * frac)
        dock_util         = _noise(95 - 40 * frac)
        order_backlog     = int(_noise(130 - 100 * frac))
        conveyor_speed    = _noise(0.12 + 1.38 * frac)
        sorter_error_rate = _noise(7.5 - 7.2 * frac)
        temp_zone         = _noise(10.5 - 6.0 * frac)

    return dict(
        stock_level=round(min(100, max(0, stock_level)), 2),
        pick_rate=round(max(0, pick_rate), 2),
        dock_util=round(min(100, max(0, dock_util)), 2),
        order_backlog=max(0, order_backlog),
        conveyor_speed=round(max(0, conveyor_speed), 2),
        sorter_error_rate=round(max(0, sorter_error_rate), 3),
        temp_zone=round(temp_zone, 2),
        flow_status=flow,
    )


# ─── Insert helpers ──────────────────────────────────────────
async def _insert_factory(pool, row: dict):
    await pool.execute("""
        INSERT INTO factory_data
          (temp_1,temp_2,pressure,energy_kwh,vibration,speed_rpm,throughput,flow_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    """, row["temp_1"], row["temp_2"], row["pressure"], row["energy_kwh"],
        row["vibration"], row["speed_rpm"], row["throughput"], row["flow_status"])


async def _insert_airport(pool, row: dict):
    await pool.execute("""
        INSERT INTO airport_data
          (passenger_count,gate_open,delay_min,runway_free,checkin_queue,baggage_wait,fuel_level,flow_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    """, row["passenger_count"], row["gate_open"], row["delay_min"], row["runway_free"],
        row["checkin_queue"], row["baggage_wait"], row["fuel_level"], row["flow_status"])


async def _insert_warehouse(pool, row: dict):
    await pool.execute("""
        INSERT INTO warehouse_data
          (stock_level,pick_rate,dock_util,order_backlog,conveyor_speed,sorter_error_rate,temp_zone,flow_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    """, row["stock_level"], row["pick_rate"], row["dock_util"], row["order_backlog"],
        row["conveyor_speed"], row["sorter_error_rate"], row["temp_zone"], row["flow_status"])


# ─── Main loop ───────────────────────────────────────────────
async def run_simulator():
    """Infinite loop — call as asyncio background task."""
    print("[Simulator] Starting data generation...")
    await asyncio.sleep(2)  # wait for DB pool to be ready
    pool = await get_pool()

    while True:
        try:
            phase = _current_phase(PHASES)
            flow  = _current_phase(FLOW_PHASES)

            await _insert_factory(pool, factory_row(phase, flow))
            await _insert_airport(pool, airport_row(phase, flow))
            await _insert_warehouse(pool, warehouse_row(phase, flow))

        except Exception as e:
            print(f"[Simulator] Error: {e}")

        await asyncio.sleep(30)
