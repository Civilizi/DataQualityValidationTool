import type { RuleExecutor, RuleIssue } from './types';

/** 非空校验: 检查指定字段是否为空 */
export const notNull: RuleExecutor = (ctx) => {
  const { fieldName } = ctx.rule;
  if (!fieldName) return [];
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    if (val === null || val === undefined || String(val).trim() === '') {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2, // +2 for 1-based + header row
        fieldName,
        originalValue: String(val ?? ''),
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 为空值`,
      });
    }
  }
  return issues;
};

/** 非空校验(别名) */
export const notEmpty: RuleExecutor = notNull;

/** 格式校验: 用正则检查字段值格式 */
export const regex: RuleExecutor = (ctx) => {
  const { fieldName, executableParams } = ctx.rule;
  if (!fieldName) return [];
  const pattern = executableParams.pattern as string;
  if (!pattern) return [];
  const re = new RegExp(pattern);
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    const str = String(val ?? '');
    if (str && !re.test(str)) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: str,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 值 "${str}" 不满足格式: ${pattern}`,
      });
    }
  }
  return issues;
};

/** 长度范围校验 */
export const lengthRange: RuleExecutor = (ctx) => {
  const { fieldName, executableParams } = ctx.rule;
  if (!fieldName) return [];
  const min = executableParams.minLength as number | undefined;
  const max = executableParams.maxLength as number | undefined;
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    const str = String(val ?? '');
    if (!str) continue;
    const len = str.length;
    if (min !== undefined && len < min) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: str,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 长度 ${len} 小于最小值 ${min}`,
      });
    } else if (max !== undefined && len > max) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: str,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 长度 ${len} 超过最大值 ${max}`,
      });
    }
  }
  return issues;
};

/** 枚举校验 */
export const enumCheck: RuleExecutor = (ctx) => {
  const { fieldName, executableParams } = ctx.rule;
  if (!fieldName) return [];
  const allowed = (executableParams.values as string[]) || [];
  if (allowed.length === 0) return [];
  const allowedSet = new Set(allowed.map(v => v.trim().toLowerCase()));
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    const str = String(val ?? '');
    if (str && !allowedSet.has(str.trim().toLowerCase())) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: str,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 值 "${str}" 不在允许值列表: ${allowed.join(', ')}`,
      });
    }
  }
  return issues;
};

/** 唯一性校验 */
export const unique: RuleExecutor = (ctx) => {
  const { fieldName } = ctx.rule;
  if (!fieldName) return [];
  const seen = new Map<string, number>();
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    const str = String(val ?? '');
    if (!str) continue;
    if (seen.has(str)) {
      const firstRow = seen.get(str)!;
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: str,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 值 "${str}" 与第 ${firstRow} 行重复`,
      });
    } else {
      seen.set(str, ctx.rows.indexOf(row) + 2);
    }
  }
  return issues;
};

/** 日期格式校验 */
export const dateFormat: RuleExecutor = (ctx) => {
  const { fieldName, executableParams } = ctx.rule;
  if (!fieldName) return [];
  const format = (executableParams.format as string) || 'YYYY-MM-DD';
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    const str = String(val ?? '');
    if (!str) continue;
    const d = new Date(str);
    if (isNaN(d.getTime())) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: str,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 值 "${str}" 不是有效的日期格式`,
      });
    }
  }
  return issues;
};

/** 值域范围校验 */
export const valueRange: RuleExecutor = (ctx) => {
  const { fieldName, executableParams } = ctx.rule;
  if (!fieldName) return [];
  const min = executableParams.min as number | undefined;
  const max = executableParams.max as number | undefined;
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val = row[fieldName];
    if (val === null || val === undefined) continue;
    const num = Number(val);
    if (isNaN(num)) continue;
    if (min !== undefined && num < min) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: String(num),
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 值 ${num} 小于最小值 ${min}`,
      });
    } else if (max !== undefined && num > max) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: String(num),
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} 值 ${num} 超过最大值 ${max}`,
      });
    }
  }
  return issues;
};

/** 跨字段逻辑校验 */
export const crossField: RuleExecutor = (ctx) => {
  const { fieldName, executableParams } = ctx.rule;
  if (!fieldName) return [];
  const operator = (executableParams.operator as string) || '>';
  const compareField = executableParams.compareField as string;
  if (!compareField) return [];
  const issues: RuleIssue[] = [];
  for (const row of ctx.rows) {
    const val1 = Number(row[fieldName]);
    const val2 = Number(row[compareField]);
    if (isNaN(val1) || isNaN(val2)) continue;
    let violation = false;
    switch (operator) {
      case '>': violation = !(val1 > val2); break;
      case '>=': violation = !(val1 >= val2); break;
      case '<': violation = !(val1 < val2); break;
      case '<=': violation = !(val1 <= val2); break;
      case '=': violation = !(val1 === val2); break;
    }
    if (violation) {
      issues.push({
        sheetName: ctx.sheetName,
        rowIndex: ctx.rows.indexOf(row) + 2,
        fieldName,
        originalValue: `${val1} vs ${compareField}=${val2}`,
        severity: ctx.rule.severity,
        issueDescription: `${fieldName} (${val1}) 与 ${compareField} (${val2}) 不满足 ${operator} 关系`,
      });
    }
  }
  return issues;
};

/** 跨表关联校验 (外键引用检查) */
/** 注: 实际逻辑在 executor.ts 中由 executeCrossTableRule 处理 */
/** 此处保留占位实现，供 EXECUTOR_MAP 使用 */
export const crossTable: RuleExecutor = (ctx) => {
  // 跨表校验需要参考表数据，由 orchestrator 统一构建引用集合后逐批次执行
  // 此处的独立执行器仅处理同一 sheet 内的简单交叉引用
  return [];
};
