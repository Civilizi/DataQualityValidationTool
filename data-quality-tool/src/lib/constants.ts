export const DIMENSION_COLORS: Record<string, string> = {
  完整性: 'blue',
  准确性: 'green',
  有效性: 'orange',
  唯一性: 'purple',
  一致性: 'cyan',
  及时性: 'gold',
};

export const LEVEL_MAP: Record<string, { color: string; label: string }> = {
  field: { color: 'blue', label: '字段级' },
  record: { color: 'orange', label: '记录级' },
  cross_dataset: { color: 'purple', label: '跨数据集级' },
};

export const SEVERITY_MAP: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: '严重' },
  warning: { color: 'gold', label: '警告' },
  info: { color: 'blue', label: '提示' },
};

export const CONFIDENCE_MAP: Record<string, { color: string; label: string }> = {
  high: { color: 'success', label: '高' },
  medium: { color: 'warning', label: '中' },
  low: { color: 'error', label: '低' },
};

export const RULE_TYPES = [
  { value: 'not_null', label: '非空校验' },
  { value: 'not_empty', label: '非空值' },
  { value: 'regex', label: '格式校验' },
  { value: 'length_range', label: '长度范围' },
  { value: 'enum_check', label: '枚举校验' },
  { value: 'unique', label: '唯一性校验' },
  { value: 'date_format', label: '日期格式' },
  { value: 'value_range', label: '值域范围' },
  { value: 'cross_field', label: '跨字段逻辑' },
  { value: 'cross_table', label: '跨表关联' },
];

export function parseSheetNames(json: string | null): string[] {
  if (!json) return [];
  try { return JSON.parse(json); } catch { return []; }
}
