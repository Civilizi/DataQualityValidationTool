/** 校验结果条目 */
export interface RuleIssue {
  sheetName: string;
  rowIndex: number;
  fieldName: string;
  originalValue: string;
  severity: 'error' | 'warning' | 'info';
  issueDescription: string;
}

/** 规则执行器的输入/输出 */
export interface RuleContext {
  sheetName: string;
  /** 所有行数据，每行是 { columnName: value } */
  rows: Record<string, unknown>[];
  /** 规则参数 */
  rule: ParsedRule;
}

export interface ParsedRule {
  id: string;
  tableName: string | null;
  fieldName: string | null;
  dimension: string | null;
  level: string | null;
  originalText: string;
  executableType: string;
  executableParams: Record<string, unknown>;
  severity: 'error' | 'warning' | 'info';
}

export type RuleExecutor = (ctx: RuleContext) => RuleIssue[];
