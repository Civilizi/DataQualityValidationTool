// ============================================================
// Database schema definitions for Data Quality Validation Tool
// All SQL statements use TEXT for IDs (UUID generated at runtime).
// Foreign key relationships are documented but not enforced via
// SQLite's FK pragma since sql.js does not persist FK state
// across save/load cycles.
// ============================================================

export const INIT_SQL = `
-- 1. Business domains
CREATE TABLE IF NOT EXISTS business_domains (
  id           TEXT PRIMARY KEY,
  name         TEXT UNIQUE NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- 2. Data standards (rules per domain, versioned)
-- FK: domain_id -> business_domains.id
CREATE TABLE IF NOT EXISTS data_standards (
  id              TEXT PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  display_name    TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  file_path       TEXT,
  file_size       INTEGER,
  file_hash       TEXT,
  parse_status    TEXT NOT NULL DEFAULT 'pending',
  total_rules     INTEGER NOT NULL DEFAULT 0,
  confirmed_rules INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE(domain_id, name, version)
);

-- 3. Validation rules (extracted from standards)
-- FK: standard_id -> data_standards.id
CREATE TABLE IF NOT EXISTS validation_rules (
  id                 TEXT PRIMARY KEY,
  standard_id        TEXT NOT NULL,
  table_name         TEXT,
  field_name         TEXT,
  dimension          TEXT,
  level              TEXT,
  original_text      TEXT,
  executable_type    TEXT,
  executable_params  TEXT,
  severity           TEXT NOT NULL DEFAULT 'warning',
  confidence         REAL NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending',
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- 4. Data assets (uploaded files per domain)
-- FK: domain_id -> business_domains.id
CREATE TABLE IF NOT EXISTS data_assets (
  id             TEXT PRIMARY KEY,
  domain_id      TEXT NOT NULL,
  name           TEXT NOT NULL,
  display_name   TEXT,
  version        INTEGER NOT NULL DEFAULT 1,
  file_path      TEXT,
  file_size      INTEGER,
  file_hash      TEXT,
  sheet_names    TEXT,
  row_count      INTEGER,
  column_names   TEXT,
  upload_status  TEXT NOT NULL DEFAULT 'pending',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- 5. Upload sessions (chunked uploads)
-- FK: asset_id -> data_assets.id (nullable until complete)
CREATE TABLE IF NOT EXISTS upload_sessions (
  id             TEXT PRIMARY KEY,
  asset_id       TEXT,
  file_name      TEXT NOT NULL,
  file_size      INTEGER NOT NULL,
  file_hash      TEXT,
  chunk_size     INTEGER NOT NULL,
  total_chunks   INTEGER NOT NULL,
  uploaded_chunks TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'uploading',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- 6. Field aliases (alternate names for standard fields)
-- FK: domain_id -> business_domains.id (nullable for global aliases)
CREATE TABLE IF NOT EXISTS field_aliases (
  id            TEXT PRIMARY KEY,
  standard_name TEXT NOT NULL,
  alias         TEXT NOT NULL,
  domain_id     TEXT,
  created_at    TEXT NOT NULL
);

-- 7. Validation tasks (orchestrates a full validation run)
-- FK: domain_id -> business_domains.id
-- FK: standard_id -> data_standards.id
CREATE TABLE IF NOT EXISTS validation_tasks (
  id                   TEXT PRIMARY KEY,
  domain_id            TEXT NOT NULL,
  name                 TEXT NOT NULL,
  standard_id          TEXT,
  standard_version     INTEGER,
  status               TEXT NOT NULL DEFAULT 'draft',
  field_level_status   TEXT,
  record_level_status  TEXT,
  cross_level_status   TEXT,
  progress             REAL NOT NULL DEFAULT 0,
  current_phase        TEXT,
  asset_ids            TEXT,
  field_mappings       TEXT,
  total_records        INTEGER NOT NULL DEFAULT 0,
  total_rules          INTEGER NOT NULL DEFAULT 0,
  error_count          INTEGER NOT NULL DEFAULT 0,
  warning_count        INTEGER NOT NULL DEFAULT 0,
  info_count           INTEGER NOT NULL DEFAULT 0,
  pass_rate            REAL,
  started_at           TEXT,
  completed_at         TEXT,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

-- 8. Execution logs (per-phase/per-batch progress)
-- FK: task_id -> validation_tasks.id
CREATE TABLE IF NOT EXISTS execution_logs (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  phase           TEXT NOT NULL,
  batch_number    INTEGER NOT NULL DEFAULT 0,
  batch_size      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'running',
  started_at      TEXT NOT NULL,
  completed_at    TEXT,
  error_message   TEXT,
  checkpoint_data TEXT,
  created_at      TEXT NOT NULL
);

-- 9. Validation results (individual rule violations)
-- FK: task_id -> validation_tasks.id
-- FK: rule_id -> validation_rules.id
CREATE TABLE IF NOT EXISTS validation_results (
  id                  TEXT PRIMARY KEY,
  task_id             TEXT NOT NULL,
  rule_id             TEXT,
  phase               TEXT NOT NULL,
  sheet_name          TEXT,
  row_index           INTEGER,
  field_name          TEXT,
  original_value      TEXT,
  severity            TEXT NOT NULL DEFAULT 'warning',
  issue_description   TEXT,
  ai_diagnosis        TEXT,
  ai_suggestion       TEXT,
  created_at          TEXT NOT NULL
);

-- 10. Deliverables (generated reports/artifacts)
-- FK: task_id -> validation_tasks.id
CREATE TABLE IF NOT EXISTS deliverables (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  type        TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   INTEGER,
  description TEXT,
  created_at  TEXT NOT NULL
);

-- 11. AI configurations (single-row config table)
CREATE TABLE IF NOT EXISTS ai_configs (
  id          TEXT PRIMARY KEY,
  api_key     TEXT NOT NULL,
  api_base_url TEXT,
  model       TEXT NOT NULL DEFAULT 'gpt-4o',
  temperature REAL NOT NULL DEFAULT 0.1,
  max_tokens  INTEGER NOT NULL DEFAULT 4000,
  is_active   INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL
);

-- 12. Prompt templates (reusable prompt definitions)
CREATE TABLE IF NOT EXISTS prompt_templates (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL UNIQUE,
  type               TEXT NOT NULL,
  system_prompt      TEXT NOT NULL,
  user_prompt_template TEXT,
  version            INTEGER NOT NULL DEFAULT 1,
  is_active          INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- 13. Audit logs (immutable append-only log)
-- FK: domain_id -> business_domains.id (nullable for system-level actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  domain_id   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_standards_domain    ON data_standards(domain_id);
CREATE INDEX IF NOT EXISTS idx_data_standards_name_ver   ON data_standards(name, version);

CREATE INDEX IF NOT EXISTS idx_validation_rules_standard ON validation_rules(standard_id);
CREATE INDEX IF NOT EXISTS idx_validation_rules_table    ON validation_rules(table_name);
CREATE INDEX IF NOT EXISTS idx_validation_rules_dimension ON validation_rules(dimension);
CREATE INDEX IF NOT EXISTS idx_validation_rules_level    ON validation_rules(level);
CREATE INDEX IF NOT EXISTS idx_validation_rules_severity ON validation_rules(severity);
CREATE INDEX IF NOT EXISTS idx_validation_rules_status   ON validation_rules(status);

CREATE INDEX IF NOT EXISTS idx_data_assets_domain         ON data_assets(domain_id);
CREATE INDEX IF NOT EXISTS idx_data_assets_name           ON data_assets(name);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_status     ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_asset      ON upload_sessions(asset_id);

CREATE INDEX IF NOT EXISTS idx_field_aliases_standard     ON field_aliases(standard_name);
CREATE INDEX IF NOT EXISTS idx_field_aliases_domain       ON field_aliases(domain_id);

CREATE INDEX IF NOT EXISTS idx_validation_tasks_domain    ON validation_tasks(domain_id);
CREATE INDEX IF NOT EXISTS idx_validation_tasks_standard  ON validation_tasks(standard_id);
CREATE INDEX IF NOT EXISTS idx_validation_tasks_status    ON validation_tasks(status);

CREATE INDEX IF NOT EXISTS idx_execution_logs_task        ON execution_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_phase       ON execution_logs(phase);

CREATE INDEX IF NOT EXISTS idx_validation_results_task    ON validation_results(task_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_rule    ON validation_results(rule_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_severity ON validation_results(severity);
CREATE INDEX IF NOT EXISTS idx_validation_results_phase   ON validation_results(phase);

CREATE INDEX IF NOT EXISTS idx_deliverables_task          ON deliverables(task_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_domain          ON audit_logs(domain_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity          ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created        ON audit_logs(created_at);
`;

// ---------- SQL statement exports for individual operations ----------

export const DROP_ALL_TABLES = `
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS prompt_templates;
DROP TABLE IF EXISTS ai_configs;
DROP TABLE IF EXISTS deliverables;
DROP TABLE IF EXISTS validation_results;
DROP TABLE IF EXISTS execution_logs;
DROP TABLE IF EXISTS validation_tasks;
DROP TABLE IF EXISTS field_aliases;
DROP TABLE IF EXISTS upload_sessions;
DROP TABLE IF EXISTS data_assets;
DROP TABLE IF EXISTS validation_rules;
DROP TABLE IF EXISTS data_standards;
DROP TABLE IF EXISTS business_domains;
`;
