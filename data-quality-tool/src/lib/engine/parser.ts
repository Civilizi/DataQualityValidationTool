import * as XLSX from 'xlsx';
import type { ParsedRule, RuleIssue } from './types';

/** 解析 Excel 文件为按 sheet 分组的数据 */
export function parseExcelFile(buffer: Buffer): Map<string, Record<string, unknown>[]> {
  const workbook = XLSX.read(buffer);
  const sheets = new Map<string, Record<string, unknown>[]>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    sheets.set(sheetName, rows as Record<string, unknown>[]);
  }

  return sheets;
}

/** 将 validation_rules 表的 executable_params JSON 字符串解析为对象 */
export function parseRuleParams(jsonStr: string | null): Record<string, unknown> {
  if (!jsonStr) return {};
  try {
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}

/** 将 DB 中的规则行转换为 ParsedRule */
export function toParsedRule(
  id: string,
  row: Record<string, unknown>,
): ParsedRule {
  return {
    id,
    tableName: (row.table_name as string) ?? null,
    fieldName: (row.field_name as string) ?? null,
    dimension: (row.dimension as string) ?? null,
    level: (row.level as string) ?? null,
    originalText: (row.original_text as string) ?? '',
    executableType: (row.executable_type as string) ?? 'custom',
    executableParams: parseRuleParams(row.executable_params as string),
    severity: ((row.severity as string) ?? 'warning') as 'error' | 'warning' | 'info',
  };
}
