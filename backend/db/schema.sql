-- ============================================================
--  Digital Twin 2 — PostgreSQL Schema
--  Auto-run on first Docker start via docker-entrypoint-initdb.d
-- ============================================================

-- ── Factory sensor data ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS factory_data (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Sensors
    temp_1          NUMERIC(6,2),   -- °C  (normal 20-60, warn 60-80, crit >80)
    temp_2          NUMERIC(6,2),   -- °C
    pressure        NUMERIC(6,2),   -- bar (normal 1-4, warn 4-5, crit >5)
    energy_kwh      NUMERIC(8,3),   -- kWh cumulative per reading
    vibration       NUMERIC(6,3),   -- mm/s (normal 0-3, warn 3-6, crit >6)
    speed_rpm       NUMERIC(7,2),   -- RPM
    throughput      NUMERIC(5,2),   -- % (0-100)
    -- Flow state for connection animations
    flow_status     TEXT            DEFAULT 'green'  -- green/orange/red
);

-- ── Airport sensor data ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS airport_data (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    passenger_count INTEGER,        -- per minute
    gate_open       INTEGER,        -- 0/1 boolean
    delay_min       NUMERIC(5,1),   -- minutes (normal 0-10, warn 10-30, crit >30)
    runway_free     INTEGER,        -- 0/1
    checkin_queue   INTEGER,        -- people in queue (normal <50, warn 50-100, crit >100)
    baggage_wait    NUMERIC(5,1),   -- minutes (normal <20, warn 20-40, crit >40)
    fuel_level      NUMERIC(5,2),   -- % (normal >40, warn 20-40, crit <20)
    flow_status     TEXT            DEFAULT 'green'
);

-- ── Warehouse sensor data ────────────────────────────────────
CREATE TABLE IF NOT EXISTS warehouse_data (
    id              BIGSERIAL PRIMARY KEY,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stock_level     NUMERIC(5,2),   -- % capacity (normal >40, warn 20-40, crit <20)
    pick_rate       NUMERIC(6,2),   -- items/hour (normal >200, warn 100-200, crit <100)
    dock_util       NUMERIC(5,2),   -- % (normal <80, warn 80-90, crit >90)
    order_backlog   INTEGER,        -- orders pending (normal <50, warn 50-100, crit >100)
    conveyor_speed  NUMERIC(5,2),   -- m/s (normal 0.5-2, warn 0.2-0.5, crit <0.2)
    sorter_error_rate NUMERIC(5,3), -- % errors (normal <1, warn 1-5, crit >5)
    temp_zone       NUMERIC(5,2),   -- °C for cold storage
    flow_status     TEXT            DEFAULT 'green'
);

-- ── KPI assignments (formula rules) ─────────────────────────
CREATE TABLE IF NOT EXISTS kpi_assignments (
    id              BIGSERIAL PRIMARY KEY,
    domain          TEXT NOT NULL,
    component_id    TEXT NOT NULL,
    kpi_name        TEXT NOT NULL,
    formula         TEXT NOT NULL,    -- e.g. "temp_1 + temp_2 * 0.5"
    unit            TEXT DEFAULT '',
    orange_threshold NUMERIC,         -- warn threshold
    red_threshold   NUMERIC,          -- critical threshold
    direction       TEXT DEFAULT 'asc', -- 'asc' = higher is worse
    interaction     TEXT DEFAULT 'pulse',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (domain, component_id, kpi_name)
);

-- ── Layout state (saved twin configs) ───────────────────────
CREATE TABLE IF NOT EXISTS layout_state (
    id          TEXT PRIMARY KEY DEFAULT 'default',
    domain      TEXT,
    name        TEXT,
    state_json  JSONB,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Default KPI assignments for demo ────────────────────────
INSERT INTO kpi_assignments (domain, component_id, kpi_name, formula, unit, orange_threshold, red_threshold, direction, interaction)
VALUES
  ('factory', 'hydraulic_press_101', 'Temperature',  'temp_1',       '°C',  60, 80,  'asc', 'pulse'),
  ('factory', 'hydraulic_press_101', 'Pressure',     'pressure',     'bar',  4,  5,  'asc', 'glow'),
  ('factory', 'conveyor_belt_102',   'Throughput',   'throughput',   '%',   50, 30,  'desc','transition'),
  ('factory', 'conveyor_belt_102',   'Vibration',    'vibration',    'mm/s', 3,  6,  'asc', 'pulse'),
  ('factory', 'cnc_machine_103',     'Speed',        'speed_rpm',    'RPM', 2000, 3000, 'asc','glow'),
  ('factory', 'cnc_machine_103',     'Energy',       'energy_kwh',   'kWh', 50, 80,  'asc', 'pulse'),
  ('airport', 'gate_101',            'Delay',        'delay_min',    'min', 10, 30,  'asc', 'pulse'),
  ('airport', 'checkin_desk_102',    'Queue Length', 'checkin_queue','pax', 50, 100, 'asc', 'pulse'),
  ('airport', 'terminal_103',        'Passengers',   'passenger_count','pax/min',200,100,'desc','transition'),
  ('warehouse','storage_rack_101',   'Stock Level',  'stock_level',  '%',   40, 20,  'desc','transition'),
  ('warehouse','reception_dock_102', 'Dock Util.',   'dock_util',    '%',   80, 90,  'asc', 'glow'),
  ('warehouse','sorter_103',         'Error Rate',   'sorter_error_rate','%', 1, 5,  'asc', 'pulse')
ON CONFLICT (domain, component_id, kpi_name) DO NOTHING;

-- ── Data sources (connection wizard) ────────────────────────
CREATE TABLE IF NOT EXISTS data_sources (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    source_type     TEXT NOT NULL,       -- 'postgresql', 'mysql', 'csv', 'rest_api', etc.
    config          TEXT NOT NULL,       -- JSON (connection params, encrypted at rest)
    schema_info     TEXT,                -- JSON (auto-discovered tables/columns)
    schema_mappings TEXT,                -- JSON (admin aliases, tags, enabled fields)
    status          TEXT DEFAULT 'disconnected',  -- 'connected', 'degraded', 'disconnected'
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Published dashboards (publish system) ───────────────
CREATE TABLE IF NOT EXISTS published_dashboards (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    domain          TEXT NOT NULL,
    config          TEXT NOT NULL,       -- JSON (frozen dashboard state)
    theme           TEXT,                -- JSON (logo, colors, fonts)
    access_type     TEXT DEFAULT 'public',  -- 'public', 'password', 'invite'
    access_password TEXT,
    version         INTEGER DEFAULT 1,
    is_draft        BOOLEAN DEFAULT false,
    published_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
