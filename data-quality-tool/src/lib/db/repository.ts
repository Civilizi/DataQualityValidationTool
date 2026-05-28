import { v4 as uuidv4 } from 'uuid';
import { run, all, get } from './index';
import type {
  BusinessDomainRow,
  DataStandardRow,
  ValidationRuleRow,
  DataAssetRow,
  ValidationTaskRow,
  ValidationResultRow,
  AiConfigRow,
  AuditLogRow,
  FieldAliasRow,
  UploadSessionRow,
  ExecutionLogRow,
} from '../../types/database';

// ============================================================
// business_domains
// ============================================================

export const businessDomains = {
  async create(input: Omit<BusinessDomainRow, 'id' | 'created_at' | 'updated_at'>): Promise<BusinessDomainRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO business_domains (id, name, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.description ?? null, input.status, now, now],
    );
    return (await get<BusinessDomainRow>(
      'SELECT * FROM business_domains WHERE id = ?',
      [id],
    ))!;
  },

  async getAll(): Promise<BusinessDomainRow[]> {
    return all<BusinessDomainRow>('SELECT * FROM business_domains ORDER BY name');
  },

  async getAllWithCounts(): Promise<Array<BusinessDomainRow & { standardsCount: number; assetsCount: number; tasksCount: number }>> {
    const domains = await all<BusinessDomainRow>('SELECT * FROM business_domains ORDER BY name');
    const result = await Promise.all(
      domains.map(async (domain) => {
        const [{ standardsCount }] = await all<{ standardsCount: number }>(
          'SELECT COUNT(*) as standardsCount FROM data_standards WHERE domain_id = ?',
          [domain.id],
        );
        const [{ assetsCount }] = await all<{ assetsCount: number }>(
          'SELECT COUNT(*) as assetsCount FROM data_assets WHERE domain_id = ?',
          [domain.id],
        );
        const [{ tasksCount }] = await all<{ tasksCount: number }>(
          'SELECT COUNT(*) as tasksCount FROM validation_tasks WHERE domain_id = ?',
          [domain.id],
        );
        return { ...domain, standardsCount, assetsCount, tasksCount };
      }),
    );
    return result;
  },

  async getById(id: string): Promise<BusinessDomainRow | undefined> {
    return get<BusinessDomainRow>('SELECT * FROM business_domains WHERE id = ?', [id]);
  },

  async update(
    id: string,
    input: Partial<Pick<BusinessDomainRow, 'name' | 'description' | 'status'>>,
  ): Promise<BusinessDomainRow | undefined> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (input.name !== undefined) { clauses.push('name = ?'); params.push(input.name); }
    if (input.description !== undefined) { clauses.push('description = ?'); params.push(input.description); }
    if (input.status !== undefined) { clauses.push('status = ?'); params.push(input.status); }
    if (clauses.length === 0) return businessDomains.getById(id);
    clauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await run(
      `UPDATE business_domains SET ${clauses.join(', ')} WHERE id = ?`,
      params,
    );
    return businessDomains.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const result = await run('DELETE FROM business_domains WHERE id = ?', [id]);
    return result.changes > 0;
  },
};

// ============================================================
// data_standards
// ============================================================

export const dataStandards = {
  async create(input: Omit<DataStandardRow, 'id' | 'created_at' | 'updated_at'>): Promise<DataStandardRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO data_standards
       (id, domain_id, name, display_name, version, file_path, file_size, file_hash,
        parse_status, total_rules, confirmed_rules, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.domain_id, input.name, input.display_name ?? null, input.version ?? 1,
       input.file_path ?? null, input.file_size ?? null, input.file_hash ?? null,
       input.parse_status ?? 'pending', input.total_rules ?? 0, input.confirmed_rules ?? 0,
       now, now],
    );
    return (await get<DataStandardRow>('SELECT * FROM data_standards WHERE id = ?', [id]))!;
  },

  async getByDomain(domainId: string): Promise<DataStandardRow[]> {
    return all<DataStandardRow>(
      'SELECT * FROM data_standards WHERE domain_id = ? ORDER BY name, version DESC',
      [domainId],
    );
  },

  async getById(id: string): Promise<DataStandardRow | undefined> {
    return get<DataStandardRow>('SELECT * FROM data_standards WHERE id = ?', [id]);
  },

  async updateVersion(id: string, increment: number): Promise<DataStandardRow | undefined> {
    await run(
      'UPDATE data_standards SET version = version + ?, updated_at = ? WHERE id = ?',
      [increment, new Date().toISOString(), id],
    );
    return dataStandards.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const result = await run('DELETE FROM data_standards WHERE id = ?', [id]);
    return result.changes > 0;
  },
};

// ============================================================
// validation_rules
// ============================================================

export const validationRules = {
  async create(input: Omit<ValidationRuleRow, 'id' | 'created_at' | 'updated_at'>): Promise<ValidationRuleRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO validation_rules
       (id, standard_id, table_name, field_name, dimension, level, original_text,
        executable_type, executable_params, severity, confidence, status, sort_order,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.standard_id, input.table_name ?? null, input.field_name ?? null,
       input.dimension ?? null, input.level ?? null, input.original_text ?? null,
       input.executable_type ?? null, input.executable_params ?? null,
       input.severity ?? 'warning', input.confidence ?? 0, input.status ?? 'pending',
       input.sort_order ?? 0, now, now],
    );
    return (await get<ValidationRuleRow>('SELECT * FROM validation_rules WHERE id = ?', [id]))!;
  },

  async getByStandard(standardId: string): Promise<ValidationRuleRow[]> {
    return all<ValidationRuleRow>(
      'SELECT * FROM validation_rules WHERE standard_id = ? ORDER BY sort_order',
      [standardId],
    );
  },

  async batchUpdate(
    ids: string[],
    input: Partial<Pick<ValidationRuleRow, 'status' | 'confidence' | 'severity'>>,
  ): Promise<void> {
    if (ids.length === 0) return;
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (input.status !== undefined) { clauses.push('status = ?'); params.push(input.status); }
    if (input.confidence !== undefined) { clauses.push('confidence = ?'); params.push(input.confidence); }
    if (input.severity !== undefined) { clauses.push('severity = ?'); params.push(input.severity); }
    if (clauses.length === 0) return;
    clauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    const placeholders = ids.map(() => '?').join(', ');
    params.push(...ids);
    await run(
      `UPDATE validation_rules SET ${clauses.join(', ')} WHERE id IN (${placeholders})`,
      params,
    );
  },

  async confirm(id: string): Promise<ValidationRuleRow | undefined> {
    await run(
      `UPDATE validation_rules SET status = 'confirmed', confidence = 1, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
    return get<ValidationRuleRow>('SELECT * FROM validation_rules WHERE id = ?', [id]);
  },
};

// ============================================================
// data_assets
// ============================================================

export const dataAssets = {
  async create(input: Omit<DataAssetRow, 'id' | 'created_at' | 'updated_at'>): Promise<DataAssetRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO data_assets
       (id, domain_id, name, display_name, version, file_path, file_size, file_hash,
        sheet_names, row_count, column_names, upload_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.domain_id, input.name, input.display_name ?? null, input.version ?? 1,
       input.file_path ?? null, input.file_size ?? null, input.file_hash ?? null,
       input.sheet_names ?? null, input.row_count ?? null, input.column_names ?? null,
       input.upload_status ?? 'pending', now, now],
    );
    return (await get<DataAssetRow>('SELECT * FROM data_assets WHERE id = ?', [id]))!;
  },

  async getByDomain(domainId: string): Promise<DataAssetRow[]> {
    return all<DataAssetRow>(
      'SELECT * FROM data_assets WHERE domain_id = ? ORDER BY created_at DESC',
      [domainId],
    );
  },

  async getById(id: string): Promise<DataAssetRow | undefined> {
    return get<DataAssetRow>('SELECT * FROM data_assets WHERE id = ?', [id]);
  },

  async delete(id: string): Promise<boolean> {
    const result = await run('DELETE FROM data_assets WHERE id = ?', [id]);
    return result.changes > 0;
  },
};

// ============================================================
// validation_tasks
// ============================================================

export const validationTasks = {
  async create(input: Omit<ValidationTaskRow, 'id' | 'created_at' | 'updated_at'>): Promise<ValidationTaskRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO validation_tasks
       (id, domain_id, name, standard_id, standard_version, status,
        field_level_status, record_level_status, cross_level_status,
        progress, current_phase, asset_ids, field_mappings,
        total_records, total_rules, error_count, warning_count, info_count,
        pass_rate, started_at, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.domain_id, input.name, input.standard_id ?? null, input.standard_version ?? null,
       input.status ?? 'draft', input.field_level_status ?? null, input.record_level_status ?? null,
       input.cross_level_status ?? null, input.progress ?? 0, input.current_phase ?? null,
       input.asset_ids ?? null, input.field_mappings ?? null, input.total_records ?? 0,
       input.total_rules ?? 0, input.error_count ?? 0, input.warning_count ?? 0,
       input.info_count ?? 0, input.pass_rate ?? null, input.started_at ?? null,
       input.completed_at ?? null, now, now],
    );
    return (await get<ValidationTaskRow>('SELECT * FROM validation_tasks WHERE id = ?', [id]))!;
  },

  async getByDomain(domainId: string): Promise<ValidationTaskRow[]> {
    return all<ValidationTaskRow>(
      'SELECT * FROM validation_tasks WHERE domain_id = ? ORDER BY created_at DESC',
      [domainId],
    );
  },

  async getById(id: string): Promise<ValidationTaskRow | undefined> {
    return get<ValidationTaskRow>('SELECT * FROM validation_tasks WHERE id = ?', [id]);
  },

  async updateStatus(
    id: string,
    status: string,
    extra?: Partial<Pick<ValidationTaskRow, 'progress' | 'current_phase' | 'completed_at'>>,
  ): Promise<ValidationTaskRow | undefined> {
    const clauses: string[] = ['status = ?', 'updated_at = ?'];
    const params: unknown[] = [status, new Date().toISOString()];
    if (extra?.progress !== undefined) { clauses.push('progress = ?'); params.push(extra.progress); }
    if (extra?.current_phase !== undefined) { clauses.push('current_phase = ?'); params.push(extra.current_phase); }
    if (extra?.completed_at !== undefined) { clauses.push('completed_at = ?'); params.push(extra.completed_at); }
    params.push(id);
    await run(
      `UPDATE validation_tasks SET ${clauses.join(', ')} WHERE id = ?`,
      params,
    );
    return validationTasks.getById(id);
  },

  async updateProgress(
    id: string,
    progress: number,
    counts?: { error_count?: number; warning_count?: number; info_count?: number; pass_rate?: number },
  ): Promise<ValidationTaskRow | undefined> {
    const clauses: string[] = ['progress = ?', 'updated_at = ?'];
    const params: unknown[] = [progress, new Date().toISOString()];
    if (counts) {
      if (counts.error_count !== undefined) { clauses.push('error_count = ?'); params.push(counts.error_count); }
      if (counts.warning_count !== undefined) { clauses.push('warning_count = ?'); params.push(counts.warning_count); }
      if (counts.info_count !== undefined) { clauses.push('info_count = ?'); params.push(counts.info_count); }
      if (counts.pass_rate !== undefined) { clauses.push('pass_rate = ?'); params.push(counts.pass_rate); }
    }
    params.push(id);
    await run(
      `UPDATE validation_tasks SET ${clauses.join(', ')} WHERE id = ?`,
      params,
    );
    return validationTasks.getById(id);
  },
};

// ============================================================
// validation_results
// ============================================================

export const validationResults = {
  async create(input: Omit<ValidationResultRow, 'id' | 'created_at'>): Promise<ValidationResultRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO validation_results
       (id, task_id, rule_id, phase, sheet_name, row_index, field_name,
        original_value, severity, issue_description, ai_diagnosis, ai_suggestion, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.task_id, input.rule_id ?? null, input.phase, input.sheet_name ?? null,
       input.row_index ?? null, input.field_name ?? null, input.original_value ?? null,
       input.severity ?? 'warning', input.issue_description ?? null,
       input.ai_diagnosis ?? null, input.ai_suggestion ?? null, now],
    );
    return (await get<ValidationResultRow>('SELECT * FROM validation_results WHERE id = ?', [id]))!;
  },

  async getByTask(taskId: string): Promise<ValidationResultRow[]> {
    return all<ValidationResultRow>(
      'SELECT * FROM validation_results WHERE task_id = ? ORDER BY severity, row_index',
      [taskId],
    );
  },

  async getSummary(taskId: string): Promise<{ error_count: number; warning_count: number; info_count: number; total: number }> {
    const rows = await all<{ severity: string; cnt: number }>(
      `SELECT severity, COUNT(*) as cnt FROM validation_results WHERE task_id = ? GROUP BY severity`,
      [taskId],
    );
    const summary = { error_count: 0, warning_count: 0, info_count: 0, total: 0 };
    for (const row of rows) {
      const key = `${row.severity}_count` as keyof typeof summary;
      if (key in summary) {
        (summary as Record<string, number>)[key] = row.cnt;
      }
      summary.total += row.cnt;
    }
    return summary;
  },
};

// ============================================================
// ai_configs
// ============================================================

export const aiConfigs = {
  async getActive(): Promise<AiConfigRow | undefined> {
    return get<AiConfigRow>('SELECT * FROM ai_configs WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1');
  },

  async save(input: Omit<AiConfigRow, 'id' | 'updated_at'>): Promise<AiConfigRow> {
    const now = new Date().toISOString();
    // Deactivate existing configs if this one should be active
    if (input.is_active) {
      await run('UPDATE ai_configs SET is_active = 0, updated_at = ?', [now]);
    }
    const existing = input.is_active
      ? await aiConfigs.getActive()
      : undefined;

    if (existing) {
      // Update existing active config
      await run(
        `UPDATE ai_configs SET api_key = ?, api_base_url = ?, model = ?,
         temperature = ?, max_tokens = ?, is_active = ?, updated_at = ? WHERE id = ?`,
        [input.api_key, input.api_base_url ?? null, input.model, input.temperature,
         input.max_tokens, input.is_active ? 1 : 0, now, existing.id],
      );
      return (await get<AiConfigRow>('SELECT * FROM ai_configs WHERE id = ?', [existing.id]))!;
    }

    // Insert new config
    const id = uuidv4();
    await run(
      `INSERT INTO ai_configs (id, api_key, api_base_url, model, temperature, max_tokens, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.api_key, input.api_base_url ?? null, input.model, input.temperature,
       input.max_tokens, input.is_active ? 1 : 0, now],
    );
    return (await get<AiConfigRow>('SELECT * FROM ai_configs WHERE id = ?', [id]))!;
  },
};

// ============================================================
// audit_logs
// ============================================================

export const auditLogs = {
  async create(
    domainId: string | undefined,
    action: string,
    entityType: string,
    entityId: string | undefined,
    detail: Record<string, unknown> | undefined,
  ): Promise<AuditLogRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO audit_logs (id, domain_id, action, entity_type, entity_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, domainId ?? null, action, entityType, entityId ?? null,
       detail ? JSON.stringify(detail) : null, now],
    );
    return (await get<AuditLogRow>('SELECT * FROM audit_logs WHERE id = ?', [id]))!;
  },

  async getByDomain(domainId: string, limit = 100): Promise<AuditLogRow[]> {
    return all<AuditLogRow>(
      'SELECT * FROM audit_logs WHERE domain_id = ? ORDER BY created_at DESC LIMIT ?',
      [domainId, limit],
    );
  },

  async query(filters: {
    domainId?: string;
    from?: string;
    to?: string;
    action?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: AuditLogRow[]; total: number; page: number; pageSize: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.domainId) {
      conditions.push('domain_id = ?');
      params.push(filters.domainId);
    }
    if (filters.from) {
      conditions.push('created_at >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('created_at <= ?');
      params.push(filters.to);
    }
    if (filters.action) {
      conditions.push('action LIKE ?');
      params.push(`%${filters.action}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ total }] = await all<{ total: number }>(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params,
    );

    const pageSize = filters.pageSize ?? 20;
    const page = filters.page ?? 1;
    const offset = (page - 1) * pageSize;

    const items = await all<AuditLogRow>(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return { items, total, page, pageSize };
  },
};

// ============================================================
// field_aliases
// ============================================================

export const fieldAliases = {
  async getAll(): Promise<FieldAliasRow[]> {
    return all<FieldAliasRow>('SELECT * FROM field_aliases ORDER BY created_at DESC');
  },

  async create(input: { standardName: string; alias: string; domainId?: string }): Promise<FieldAliasRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO field_aliases (id, standard_name, alias, domain_id, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.standardName, input.alias, input.domainId ?? null, now],
    );
    return (await get<FieldAliasRow>('SELECT * FROM field_aliases WHERE id = ?', [id]))!;
  },

  async delete(id: string): Promise<boolean> {
    const result = await run('DELETE FROM field_aliases WHERE id = ?', [id]);
    return result.changes > 0;
  },
};

// ============================================================
// Standalone helper functions (for API route convenience)
// ============================================================

// --- data_standards ---

export async function getStandardsByDomain(domainId: string): Promise<DataStandardRow[]> {
  return all<DataStandardRow>(
    'SELECT * FROM data_standards WHERE domain_id = ? ORDER BY name, version DESC',
    [domainId],
  );
}

export async function getStandardById(id: string): Promise<DataStandardRow | undefined> {
  return get<DataStandardRow>('SELECT * FROM data_standards WHERE id = ?', [id]);
}

export async function updateStandard(id: string, updates: Partial<DataStandardRow>): Promise<void> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const allowed = ['name', 'display_name', 'version', 'file_path', 'file_size', 'file_hash', 'parse_status', 'total_rules', 'confirmed_rules'] as const;
  for (const key of allowed) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      clauses.push(`${key} = ?`);
      params.push((updates as Record<string, unknown>)[key]);
    }
  }
  if (clauses.length === 0) return;
  clauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  await run(`UPDATE data_standards SET ${clauses.join(', ')} WHERE id = ?`, params);
}

export async function deleteStandard(id: string): Promise<void> {
  await run('DELETE FROM data_standards WHERE id = ?', [id]);
}

export async function getNextVersion(domainId: string, name: string): Promise<number> {
  const row = await get<{ maxVersion: number }>(
    'SELECT MAX(version) as maxVersion FROM data_standards WHERE domain_id = ? AND name = ?',
    [domainId, name],
  );
  return (row?.maxVersion ?? 0) + 1;
}

// --- validation_rules ---

export async function getRulesByStandard(standardId: string, status?: string): Promise<ValidationRuleRow[]> {
  if (status) {
    return all<ValidationRuleRow>(
      'SELECT * FROM validation_rules WHERE standard_id = ? AND status = ? ORDER BY sort_order',
      [standardId, status],
    );
  }
  return all<ValidationRuleRow>(
    'SELECT * FROM validation_rules WHERE standard_id = ? ORDER BY sort_order',
    [standardId],
  );
}

export async function createRule(rule: Omit<ValidationRuleRow, 'id'>): Promise<void> {
  const now = new Date().toISOString();
  const id = uuidv4();
  await run(
    `INSERT INTO validation_rules
     (id, standard_id, table_name, field_name, dimension, level, original_text,
      executable_type, executable_params, severity, confidence, status, sort_order,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, rule.standard_id, rule.table_name ?? null, rule.field_name ?? null,
     rule.dimension ?? null, rule.level ?? null, rule.original_text ?? null,
     rule.executable_type ?? null, rule.executable_params ?? null,
     rule.severity ?? 'warning', rule.confidence ?? 0, rule.status ?? 'pending',
     rule.sort_order ?? 0, now, now],
  );
}

export async function updateRule(id: string, updates: Partial<ValidationRuleRow>): Promise<void> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const allowed = ['standard_id', 'table_name', 'field_name', 'dimension', 'level', 'original_text',
    'executable_type', 'executable_params', 'severity', 'confidence', 'status', 'sort_order'] as const;
  for (const key of allowed) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      clauses.push(`${key} = ?`);
      params.push((updates as Record<string, unknown>)[key]);
    }
  }
  if (clauses.length === 0) return;
  clauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  await run(`UPDATE validation_rules SET ${clauses.join(', ')} WHERE id = ?`, params);
}

export async function deleteRule(id: string): Promise<void> {
  await run('DELETE FROM validation_rules WHERE id = ?', [id]);
}

export async function batchConfirmRules(ruleIds: string[]): Promise<void> {
  if (ruleIds.length === 0) return;
  const now = new Date().toISOString();
  const placeholders = ruleIds.map(() => '?').join(', ');
  await run(
    `UPDATE validation_rules SET status = 'confirmed', confidence = 1, updated_at = ? WHERE id IN (${placeholders})`,
    [now, ...ruleIds],
  );
}

export async function getRulesByDomain(domainId: string): Promise<ValidationRuleRow[]> {
  return all<ValidationRuleRow>(
    `SELECT r.* FROM validation_rules r
     JOIN data_standards s ON r.standard_id = s.id
     WHERE s.domain_id = ?
     ORDER BY r.sort_order`,
    [domainId],
  );
}

// --- data_assets ---

export async function getAssetsByDomain(domainId: string): Promise<DataAssetRow[]> {
  return all<DataAssetRow>(
    'SELECT * FROM data_assets WHERE domain_id = ? ORDER BY created_at DESC',
    [domainId],
  );
}

export async function getAssetById(id: string): Promise<DataAssetRow | undefined> {
  return get<DataAssetRow>('SELECT * FROM data_assets WHERE id = ?', [id]);
}

export async function createAsset(asset: Omit<DataAssetRow, 'id'>): Promise<void> {
  const now = new Date().toISOString();
  const id = uuidv4();
  await run(
    `INSERT INTO data_assets
     (id, domain_id, name, display_name, version, file_path, file_size, file_hash,
      sheet_names, row_count, column_names, upload_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, asset.domain_id, asset.name, asset.display_name ?? null, asset.version ?? 1,
     asset.file_path ?? null, asset.file_size ?? null, asset.file_hash ?? null,
     asset.sheet_names ?? null, asset.row_count ?? null, asset.column_names ?? null,
     asset.upload_status ?? 'pending', now, now],
  );
}

export async function deleteAsset(id: string): Promise<void> {
  await run('DELETE FROM data_assets WHERE id = ?', [id]);
}

export async function getNextAssetVersion(domainId: string, name: string): Promise<number> {
  const row = await get<{ maxVersion: number }>(
    'SELECT MAX(version) as maxVersion FROM data_assets WHERE domain_id = ? AND name = ?',
    [domainId, name],
  );
  return (row?.maxVersion ?? 0) + 1;
}

// --- upload_sessions ---

export async function createUploadSession(session: Omit<UploadSessionRow, 'id'>): Promise<string> {
  const now = new Date().toISOString();
  const id = uuidv4();
  await run(
    `INSERT INTO upload_sessions
     (id, asset_id, file_name, file_size, file_hash, chunk_size, total_chunks,
      uploaded_chunks, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, session.asset_id ?? null, session.file_name, session.file_size,
     session.file_hash ?? null, session.chunk_size, session.total_chunks,
     session.uploaded_chunks, session.status ?? 'uploading', now, now],
  );
  return id;
}

export async function getUploadSession(sessionId: string): Promise<UploadSessionRow | undefined> {
  return get<UploadSessionRow>('SELECT * FROM upload_sessions WHERE id = ?', [sessionId]);
}

export async function updateUploadSession(sessionId: string, updates: Partial<UploadSessionRow>): Promise<void> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const allowed = ['asset_id', 'file_name', 'file_size', 'file_hash', 'chunk_size', 'total_chunks',
    'uploaded_chunks', 'status'] as const;
  for (const key of allowed) {
    if ((updates as Record<string, unknown>)[key] !== undefined) {
      clauses.push(`${key} = ?`);
      params.push((updates as Record<string, unknown>)[key]);
    }
  }
  if (clauses.length === 0) return;
  clauses.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(sessionId);
  await run(`UPDATE upload_sessions SET ${clauses.join(', ')} WHERE id = ?`, params);
}

export async function deleteUploadSession(sessionId: string): Promise<void> {
  await run('DELETE FROM upload_sessions WHERE id = ?', [sessionId]);
}

// ============================================================
// execution_logs
// ============================================================

export const executionLogs = {
  async create(input: {
    task_id: string;
    phase: string;
    batch_number: number;
    batch_size: number;
    status: string;
    started_at: string;
    completed_at?: string | null;
    error_message?: string | null;
    checkpoint_data?: string | null;
  }): Promise<string> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO execution_logs
       (id, task_id, phase, batch_number, batch_size, status, started_at, completed_at, error_message, checkpoint_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.task_id, input.phase, input.batch_number, input.batch_size,
       input.status, input.started_at, input.completed_at ?? null,
       input.error_message ?? null, input.checkpoint_data ?? null, now],
    );
    return id;
  },

  async getByTask(taskId: string): Promise<ExecutionLogRow[]> {
    return all<ExecutionLogRow>(
      'SELECT * FROM execution_logs WHERE task_id = ? ORDER BY batch_number',
      [taskId],
    );
  },

  async getCheckpoint(taskId: string, phase: string, batchNumber: number): Promise<ExecutionLogRow | undefined> {
    return get<ExecutionLogRow>(
      'SELECT * FROM execution_logs WHERE task_id = ? AND phase = ? AND batch_number = ?',
      [taskId, phase, batchNumber],
    );
  },

  async update(id: string, updates: Partial<Pick<ExecutionLogRow, 'status' | 'completed_at' | 'error_message' | 'checkpoint_data'>>): Promise<void> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    const allowed = ['status', 'completed_at', 'error_message', 'checkpoint_data'] as const;
    for (const key of allowed) {
      if ((updates as Record<string, unknown>)[key] !== undefined) {
        clauses.push(`${key} = ?`);
        params.push((updates as Record<string, unknown>)[key]);
      }
    }
    if (clauses.length === 0) return;
    params.push(id);
    await run(
      `UPDATE execution_logs SET ${clauses.join(', ')} WHERE id = ?`,
      params,
    );
  },
};
