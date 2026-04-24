-- Migration 002 : index de performance
-- Améliore les requêtes ORDER BY id DESC (les plus fréquentes dans le projet).

CREATE INDEX IF NOT EXISTS idx_factory_data_recorded_at   ON factory_data   (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_airport_data_recorded_at   ON airport_data   (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_data_recorded_at ON warehouse_data (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_assignments_domain     ON kpi_assignments (domain, component_id);
CREATE INDEX IF NOT EXISTS idx_published_dashboards_updated ON published_dashboards (updated_at DESC);
