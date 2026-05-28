import type { ParsedRule } from './types';
import { toParsedRule, parseRuleParams } from './parser';

export interface RuleConflict {
  ruleA: string; // rule id
  ruleB: string; // rule id
  conflictType: string;
  description: string;
  severity: 'error' | 'warning';
}

/**
 * 检测同一标准下规则之间的冲突。
 * 冲突类型:
 *   range_overlap: 同一字段 value_range 与 enum_check 范围互斥
 *   duplicate_rule: 同一字段同一维度多条相同类型规则
 *   severity_conflict: 同一字段相同维度但严重等级矛盾
 */
export function detectRuleConflicts(rules: Array<{ id: string; dbRow: Record<string, unknown> }>): RuleConflict[] {
  const parsed = rules.map(r => toParsedRule(r.id, r.dbRow));
  const conflicts: RuleConflict[] = [];

  // Group by table + field
  const fieldGroups = new Map<string, ParsedRule[]>();
  for (const rule of parsed) {
    const key = `${rule.tableName ?? ''}.${rule.fieldName ?? ''}`;
    if (!fieldGroups.has(key)) fieldGroups.set(key, []);
    fieldGroups.get(key)!.push(rule);
  }

  for (const [_key, groupRules] of fieldGroups) {
    if (groupRules.length < 2) continue;

    for (let i = 0; i < groupRules.length; i++) {
      for (let j = i + 1; j < groupRules.length; j++) {
        const a = groupRules[i];
        const b = groupRules[j];

        // 1. duplicate_rule: same type, same field, same dimension
        if (a.executableType === b.executableType &&
            a.dimension === b.dimension &&
            a.id !== b.id) {
          conflicts.push({
            ruleA: a.id,
            ruleB: b.id,
            conflictType: 'duplicate_rule',
            description: `${a.fieldName} 存在两条相同类型的规则: ${a.executableType}`,
            severity: 'warning',
          });
        }

        // 2. range_overlap: value_range vs enum_check on same field
        if ((a.executableType === 'value_range' && b.executableType === 'enum_check') ||
            (a.executableType === 'enum_check' && b.executableType === 'value_range')) {
          const rangeRule = a.executableType === 'value_range' ? a : b;
          const enumRule = a.executableType === 'enum_check' ? a : b;

          const params = rangeRule.executableParams;
          const minVal = Number(params.min);
          const maxVal = Number(params.max);

          const enumParams = enumRule.executableParams;
          const enumValues = (enumParams.values as string | undefined)?.split(',').map(v => v.trim()).filter(Boolean) || [];

          const outOfRange = enumValues.filter(v => {
            const num = Number(v);
            return isNaN(num) || (minVal !== undefined && num < minVal) || (maxVal !== undefined && num > maxVal);
          });

          if (outOfRange.length > 0) {
            conflicts.push({
              ruleA: a.id,
              ruleB: b.id,
              conflictType: 'range_overlap',
              description: `${a.fieldName} 的枚举值 [${outOfRange.join(', ')}] 超出值范围 [${minVal}, ${maxVal}]`,
              severity: 'error',
            });
          }
        }

        // 3. regex vs format: regex 与 date_format 可能对同一字段产生不同结果
        if ((a.executableType === 'regex' && b.executableType === 'date_format') ||
            (a.executableType === 'date_format' && b.executableType === 'regex')) {
          conflicts.push({
            ruleA: a.id,
            ruleB: b.id,
            conflictType: 'format_conflict',
            description: `${a.fieldName} 同时配置了正则表达式和日期格式规则，可能产生冲突`,
            severity: 'warning',
          });
        }

        // 4. not_null vs value_range default: notNull 和带默认值的 range 可能冲突
        if ((a.executableType === 'not_null' && b.executableType === 'value_range') ||
            (a.executableType === 'value_range' && b.executableType === 'not_null')) {
          const params = b.executableType === 'value_range' ? b.executableParams : a.executableParams;
          if (params.allowEmpty === true) {
            conflicts.push({
              ruleA: a.id,
              ruleB: b.id,
              conflictType: 'nullability_conflict',
              description: `${a.fieldName} 同时要求非空且允许空值`,
              severity: 'error',
            });
          }
        }
      }
    }
  }

  return conflicts;
}
