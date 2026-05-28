// ============================================================
// TypeScript interfaces for all 13 database tables.
// All fields map directly to the SQLite column types:
//   TEXT  -> string
//   INTEGER -> number
//   REAL -> number
// JSON columns are stored as strings and should be parsed on read.
// ============================================================

/** 1. business_domains */
export interface BusinessDomainRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** 2. data_standards */
export interface DataStandardRow {
  id: string;
  domain_id: string;
  name: string;
  display_name: string | null;
  version: number;
  file_path: string | null;
  file_size: number | null;
  file_hash: string | null;
  parse_status: string;
  total_rules: number;
  confirmed_rules: number;
  created_at: string;
  updated_at: string;
}

/** 3. validation_rules */
export interface ValidationRuleRow {
  id: string;
  standard_id: string;
  table_name: string | null;
  field_name: string | null;
  dimension: string | null;
  level: string | null;
  original_text: string | null;
  executable_type: string | null;
  executable_params: string | null; // JSON string
  severity: string;
  confidence: number;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 4. data_assets */
export interface DataAssetRow {
  id: string;
  domain_id: string;
  name: string;
  display_name: string | null;
  version: number;
  file_path: string | null;
  file_size: number | null;
  file_hash: string | null;
  sheet_names: string | null; // JSON string
  row_count: number | null;
  column_names: string | null; // JSON string
  upload_status: string;
  created_at: string;
  updated_at: string;
}

/** 5. upload_sessions */
export interface UploadSessionRow {
  id: string;
  asset_id: string | null;
  file_name: string;
  file_size: number;
  file_hash: string | null;
  chunk_size: number;
  total_chunks: number;
  uploaded_chunks: string; // JSON string
  status: string;
  created_at: string;
  updated_at: string;
}

/** 6. field_aliases */
export interface FieldAliasRow {
  id: string;
  standard_name: string;
  alias: string;
  domain_id: string | null;
  created_at: string;
}

/** 7. validation_tasks */
export interface ValidationTaskRow {
  id: string;
  domain_id: string;
  name: string;
  standard_id: string | null;
  standard_version: number | null;
  status: string;
  field_level_status: string | null;
  record_level_status: string | null;
  cross_level_status: string | null;
  progress: number;
  current_phase: string | null;
  asset_ids: string | null; // JSON string
  field_mappings: string | null; // JSON string
  total_records: number;
  total_rules: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  pass_rate: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 8. execution_logs */
export interface ExecutionLogRow {
  id: string;
  task_id: string;
  phase: string;
  batch_number: number;
  batch_size: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  checkpoint_data: string | null; // JSON string
  created_at: string;
}

/** 9. validation_results */
export interface ValidationResultRow {
  id: string;
  task_id: string;
  rule_id: string | null;
  phase: string;
  sheet_name: string | null;
  row_index: number | null;
  field_name: string | null;
  original_value: string | null;
  severity: string;
  issue_description: string | null;
  ai_diagnosis: string | null;
  ai_suggestion: string | null;
  created_at: string;
}

/** 10. deliverables */
export interface DeliverableRow {
  id: string;
  task_id: string;
  version: number;
  type: string;
  file_path: string;
  file_size: number | null;
  description: string | null;
  created_at: string;
}

/** 11. ai_configs */
export interface AiConfigRow {
  id: string;
  api_key: string;
  api_base_url: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: number; // 0 or 1 (SQLite INTEGER)
  updated_at: string;
}

/** 12. prompt_templates */
export interface PromptTemplateRow {
  id: string;
  name: string;
  type: string;
  system_prompt: string;
  user_prompt_template: string | null;
  version: number;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

/** 13. audit_logs */
export interface AuditLogRow {
  id: string;
  domain_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  detail: string | null; // JSON string
  created_at: string;
}
