import fs from 'fs';
import { parseExcelFile, toParsedRule } from './parser';
import * as executors from './rules';
import type { RuleExecutor, ParsedRule, RuleIssue } from './types';

const EXECUTOR_MAP: Record<string, RuleExecutor> = {
  not_null: executors.notNull,
  not_empty: executors.notEmpty,
  regex: executors.regex,
  length_range: executors.lengthRange,
  enum_check: executors.enumCheck,
  unique: executors.unique,
  date_format: executors.dateFormat,
  value_range: executors.valueRange,
  cross_field: executors.crossField,
  cross_table: executors.crossTable,
};

/** 执行单个规则对单个 sheet 的校验 */
function executeRule(rule: ParsedRule, sheetName: string, rows: Record<string, unknown>[]): RuleIssue[] {
  const executor = EXECUTOR_MAP[rule.executableType];
  if (!executor) {
    // Unknown rule type, skip
    return [];
  }
  return executor({ sheetName, rows, rule });
}

/**
 * 执行所有规则对所有数据的校验。
 * 返回所有发现的问题列表。
 */
export async function executeValidation(
  assetFilePaths: string[],
  rules: Array<{ id: string; dbRow: Record<string, unknown> }>,
  onProgress?: (phase: string, progress: number, issues: RuleIssue[]) => void,
): Promise<RuleIssue[]> {
  const allIssues: RuleIssue[] = [];
  const parsedRules = rules.map(r => toParsedRule(r.id, r.dbRow));

  // Phase 1: 字段级规则
  const fieldRules = parsedRules.filter(r => r.level === 'field' || !r.level);
  let fieldIssueCount = 0;

  onProgress?.('字段级校验', 0, []);

  for (const assetPath of assetFilePaths) {
    if (!fs.existsSync(assetPath)) continue;
    const buffer = fs.readFileSync(assetPath);
    const sheets = parseExcelFile(buffer);

    for (const [sheetName, rows] of sheets) {
      for (const rule of fieldRules) {
        // If rule targets a specific table, skip non-matching sheets
        if (rule.tableName && !sheetName.includes(rule.tableName)) continue;

        const issues = executeRule(rule, sheetName, rows);
        allIssues.push(...issues);
        fieldIssueCount += issues.length;
      }
    }
  }

  onProgress?.('字段级校验', 100, allIssues.slice(fieldIssueCount));

  // Phase 2: 记录级规则
  const recordRules = parsedRules.filter(r => r.level === 'record');
  let recordStartIdx = allIssues.length;

  onProgress?.('记录级校验', 0, []);

  for (const assetPath of assetFilePaths) {
    if (!fs.existsSync(assetPath)) continue;
    const buffer = fs.readFileSync(assetPath);
    const sheets = parseExcelFile(buffer);

    for (const [sheetName, rows] of sheets) {
      for (const rule of recordRules) {
        if (rule.tableName && !sheetName.includes(rule.tableName)) continue;
        const issues = executeRule(rule, sheetName, rows);
        allIssues.push(...issues);
      }
    }
  }

  onProgress?.('记录级校验', 100, allIssues.slice(recordStartIdx));

  // Phase 3: 跨表级规则
  const crossRules = parsedRules.filter(r => r.level === 'cross_dataset');
  let crossStartIdx = allIssues.length;

  onProgress?.('跨表级校验', 0, []);

  // For cross-table rules, we need to collect all sheets from all assets
  const allSheets = new Map<string, Record<string, unknown>[]>();
  for (const assetPath of assetFilePaths) {
    if (!fs.existsSync(assetPath)) continue;
    const buffer = fs.readFileSync(assetPath);
    const sheets = parseExcelFile(buffer);
    for (const [name, rows] of sheets) {
      allSheets.set(name, rows);
    }
  }

  for (const rule of crossRules) {
    // For cross_table: check that referenced table's key exists
    if (rule.executableType === 'cross_table') {
      const refTable = rule.executableParams.refTable as string | undefined;
      const refField = rule.executableParams.refField as string | undefined;
      const localField = rule.fieldName;
      if (!refTable || !refField || !localField) continue;

      // Find the reference sheet
      const refSheet = [...allSheets.entries()].find(([name]) => name.includes(refTable));
      if (!refSheet) continue;
      const refValues = new Set(refSheet[1].map(r => String(r[refField] ?? '')));

      for (const [sheetName, rows] of allSheets.entries()) {
        if (rule.tableName && !sheetName.includes(rule.tableName)) continue;
        for (const row of rows) {
          const val = String(row[localField] ?? '');
          if (val && !refValues.has(val)) {
            allIssues.push({
              sheetName,
              rowIndex: rows.indexOf(row) + 2,
              fieldName: localField,
              originalValue: val,
              severity: rule.severity,
              issueDescription: `${localField} 值 "${val}" 在 ${refTable} 中不存在`,
            });
          }
        }
      }
    }
  }

  onProgress?.('跨表级校验', 100, allIssues.slice(crossStartIdx));

  return allIssues;
}
