-- Migration 001 : schéma initial
-- Crée toutes les tables du projet et insère les KPIs de démonstration.

-- ── Factory sensor data ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_data (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    temp_1          NUMERIC(6,2),
    temp_2          NUMERIC(6,2),
    pressure        NUMERIC(6,2),
    energy_kwh      NUMERIC(8,3),
    vibration       NUMERIC(6,3),
    speed_rpm       NUMERIC(7,2),
    throughput      NUMERIC(5,2),
    flow_status     TEXT DEFAULT 'green'
);

-- ── Airport sensor data ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS airport_data (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    passenger_count INTEGER,
    gate_open       INTEGER,
    delay_min       NUMERIC(5,1),
    runway_free     INTEGER,
    checkin_queue   INTEGER,
    baggage_wait    NUMERIC(5,1),
    fuel_level      NUMERIC(5,2),
    flow_status     TEXT DEFAULT 'green'
);

-- ── Warehouse sensor data ────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_data (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stock_level     NUMERIC(5,2),
    pick_rate       NUMERIC(6,2),
    dock_util       NUMERIC(5,2),
    order_backlog   INTEGER,
    conveyor_speed  NUMERIC(5,2),
    sorter_error_rate NUMERIC(5,3),
    temp_zone       NUMERIC(5,2),
    flow_status     TEXT DEFAULT 'green'
);

-- ── KPI assignments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kpi_assignments (
    id               BIGSERIAL PRIMARY KEY,
    domain           TEXT NOT NULL,
    component_id     TEXT NOT NULL,
    kpi_name         TEXT NOT NULL,
    formula          TEXT NOT NULL,
    unit             TEXT DEFAULT '',
    orange_threshold NUMERIC,
    red_threshold    NUMERIC,
    direction        TEXT DEFAULT 'asc',
    interaction      TEXT DEFAULT 'pulse',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (domain, component_id, kpi_name)
);

-- ── Layout state ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS layout_state (
    id         TEXT PRIMARY KEY DEFAULT 'default',
    domain     TEXT,
    name       TEXT,
    state_json JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Data sources ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS data_sources (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    source_type     TEXT NOT NULL,
    config          TEXT NOT NULL,
    schema_info     TEXT,
    schema_mappings TEXT,
    status          TEXT DEFAULT 'disconnected',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Published dashboards ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS published_dashboards (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    domain          TEXT NOT NULL,
    config          TEXT NOT NULL,
    theme           TEXT,
    access_type     TEXT DEFAULT 'public',
    access_password TEXT,
    version         INTEGER DEFAULT 1,
    is_draft        BOOLEAN DEFAULT false,
    published_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── KPIs de démonstration ────────────────────────────────────
INSERT INTO kpi_assignments (domain, component_id, kpi_name, formula, unit, orange_threshold, red_threshold, direction, interaction)
VALUES
  ('factory',   'hydraulic_press_101', 'Temperature',  'temp_1',             '°C',     60,   80,  'asc',  'pulse'),
  ('factory',   'hydraulic_press_101', 'Pressure',     'pressure',           'bar',     4,    5,   'asc',  'glow'),
  ('factory',   'conveyor_belt_102',   'Throughput',   'throughput',         '%',      50,   30,   'desc', 'transition'),
  ('factory',   'conveyor_belt_102',   'Vibration',    'vibration',          'mm/s',    3,    6,   'asc',  'pulse'),
  ('factory',   'cnc_machine_103',     'Speed',        'speed_rpm',          'RPM',  2000, 3000,   'asc',  'glow'),
  ('factory',   'cnc_machine_103',     'Energy',       'energy_kwh',         'kWh',    50,   80,   'asc',  'pulse'),
  ('airport',   'gate_101',            'Delay',        'delay_min',          'min',    10,   30,   'asc',  'pulse'),
  ('airport',   'checkin_desk_102',    'Queue Length', 'checkin_queue',      'pax',    50,  100,   'asc',  'pulse'),
  ('airport',   'terminal_103',        'Passengers',   'passenger_count',    'pax/min',200, 100,   'desc', 'transition'),
  ('warehouse', 'storage_rack_101',    'Stock Level',  'stock_level',        '%',      40,   20,   'desc', 'transition'),
  ('warehouse', 'reception_dock_102',  'Dock Util.',   'dock_util',          '%',      80,   90,   'asc',  'glow'),
  ('warehouse', 'sorter_103',          'Error Rate',   'sorter_error_rate',  '%',       1,    5,   'asc',  'pulse')
ON CONFLICT (domain, component_id, kpi_name) DO NOTHING;
