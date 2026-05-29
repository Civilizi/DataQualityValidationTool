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

export type PhaseName = 'field_level' | 'record_level' | 'cross_level';

/** 校验进度回调 */
export interface ProgressUpdate {
  phase: PhaseName;
  phaseLabel: string;
  batchNumber: number;
  totalBatches: number;
  phaseProgress: number;
  totalProgress: number;
  issues: RuleIssue[];
}

/** 校验配置 */
export interface ValidationConfig {
  batchSize?: number;
  resumeFromCheckpoint?: boolean;
}

/** 执行单个规则对单个 sheet 的校验 */
function executeRule(rule: ParsedRule, sheetName: string, rows: Record<string, unknown>[]): RuleIssue[] {
  const executor = EXECUTOR_MAP[rule.executableType];
  if (!executor) return [];
  return executor({ sheetName, rows, rule });
}

/** 按批次切分行数据 */
function chunkRows(rows: Record<string, unknown>[], batchSize: number): Record<string, unknown>[][] {
  const chunks: Record<string, unknown>[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    chunks.push(rows.slice(i, i + batchSize));
  }
  return chunks.length > 0 ? chunks : [rows];
}

/**
 * 跨表校验: 检查某 sheet 某字段的值是否在另一 sheet 的参考字段中存在。
 */
function executeCrossTableRule(
  rule: ParsedRule,
  sheetName: string,
  chunk: Record<string, unknown>[],
  chunkStartIndex: number,
  refSets: Map<string, Set<string>>,
): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const refTable = rule.executableParams.refTable as string | undefined;
  const refField = rule.executableParams.refField as string | undefined;
  const localField = rule.fieldName;

  if (!refTable || !refField || !localField) return issues;

  const refValues = refSets.get(`${refTable}.${refField}`);
  if (!refValues) {
    issues.push({
      sheetName,
      rowIndex: 1,
      fieldName: localField,
      originalValue: '',
      severity: 'error',
      issueDescription: `跨表规则引用表 ${refTable}.${refField} 未找到，规则已跳过`,
    });
    return issues;
  }

  for (const row of chunk) {
    const val = String(row[localField] ?? '').trim();
    if (!val) continue; // 空值由 notNull/notEmpty 规则处理
    if (!refValues.has(val)) {
      issues.push({
        sheetName,
        rowIndex: chunkStartIndex + chunk.indexOf(row) + 2,
        fieldName: localField,
        originalValue: val,
        severity: rule.severity,
        issueDescription: `${localField} 值 "${val}" 在参考表 ${refTable}.${refField} 中不存在`,
      });
    }
  }
  return issues;
}

/** 跨数据级汇总校验: 检查某 sheet 某字段的汇总值是否符合阈值 */
function executeCrossAggregationRule(
  rule: ParsedRule,
  allSheets: Map<string, Record<string, unknown>[]>,
): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const { aggSheet, aggField, aggFunc, aggThreshold } = rule.executableParams as Record<string, string>;
  if (!aggSheet || !aggField || !aggFunc || aggThreshold === undefined) return issues;

  const targetSheet = [...allSheets.entries()].find(([n]) => n.includes(aggSheet));
  if (!targetSheet) return issues;

  const rows = targetSheet[1];
  const values = rows
    .map(r => Number(r[aggField]))
    .filter(v => !isNaN(v));

  let result: number | null = null;
  if (aggFunc === 'sum' || aggFunc === 'SUM') {
    result = values.reduce((a, b) => a + b, 0);
  } else if (aggFunc === 'avg' || aggFunc === 'AVG') {
    result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  } else if (aggFunc === 'count' || aggFunc === 'COUNT') {
    result = values.length;
  }

  if (result !== null) {
    const threshold = Number(aggThreshold);
    if (!isNaN(threshold) && result > threshold) {
      issues.push({
        sheetName: targetSheet[0],
        rowIndex: 1,
        fieldName: aggField,
        originalValue: String(result),
        severity: rule.severity as 'error' | 'warning' | 'info',
        issueDescription: `${aggSheet}.${aggField} 的 ${aggFunc} 值 ${result} 超过阈值 ${aggThreshold}`,
      });
    }
  }
  return issues;
}

/**
 * 分阶段分批执行校验。
 * 每完成一个批次就回调进度，便于前端实时更新和断点续跑。
 */
export async function executeValidation(
  assetFilePaths: string[],
  rules: Array<{ id: string; dbRow: Record<string, unknown> }>,
  onProgress: (update: ProgressUpdate) => Promise<void>,
  config: ValidationConfig = {},
): Promise<RuleIssue[]> {
  const { batchSize = 200, resumeFromCheckpoint = true } = config;
  const allIssues: RuleIssue[] = [];
  const parsedRules = rules.map(r => toParsedRule(r.id, r.dbRow));

  // Load all asset data once
  interface AssetData {
    path: string;
    sheets: Map<string, Record<string, unknown>[]>;
  }
  const assets: AssetData[] = [];
  for (const assetPath of assetFilePaths) {
    if (!fs.existsSync(assetPath)) continue;
    const buffer = fs.readFileSync(assetPath);
    const sheets = parseExcelFile(buffer);
    assets.push({ path: assetPath, sheets });
  }

  // Calculate total batches for progress tracking
  function countTotalBatches(phase: PhaseName, assetDataList: AssetData[], rulesForPhase: ParsedRule[]): number {
    let total = 0;
    for (const asset of assetDataList) {
      for (const [sheetName, rows] of asset.sheets) {
        const matchingRules = rulesForPhase.filter(r => !r.tableName || sheetName.includes(r.tableName));
        if (matchingRules.length === 0) continue;
        total += chunkRows(rows, batchSize).length;
      }
    }
    return Math.max(total, 1);
  }

  function countCrossBatches(assetDataList: AssetData[], crossRules: ParsedRule[]): number {
    const allSheets = new Map<string, Record<string, unknown>[]>();
    for (const asset of assetDataList) {
      for (const [name, rows] of asset.sheets) {
        allSheets.set(name, rows);
      }
    }
    let total = 0;
    for (const [sheetName, rows] of allSheets) {
      const matchingRules = crossRules.filter(r => !r.tableName || sheetName.includes(r.tableName));
      if (matchingRules.length === 0) continue;
      total += chunkRows(rows, batchSize).length;
    }
    return Math.max(total, 1);
  }

  let completedBatches = 0;

  // --- Phase 1: 字段级规则 ---
  const fieldRules = parsedRules.filter(r => r.level === 'field' || !r.level);
  const fieldTotal = countTotalBatches('field_level', assets, fieldRules);
  let fieldIssues: RuleIssue[] = [];

  if (fieldRules.length > 0) {
    for (const asset of assets) {
      for (const [sheetName, rows] of asset.sheets) {
        const matchingRules = fieldRules.filter(r => !r.tableName || sheetName.includes(r.tableName));
        if (matchingRules.length === 0) continue;

        const rowChunks = chunkRows(rows, batchSize);
        for (let bi = 0; bi < rowChunks.length; bi++) {
          const chunk = rowChunks[bi];
          const phaseProgress = ((bi + 1) / rowChunks.length) * 100;
          const totalProgress = Math.round(((completedBatches + bi + 1) / fieldTotal) * 100);

          for (const rule of matchingRules) {
            const issues = executeRule(rule, sheetName, chunk);
            allIssues.push(...issues);
            fieldIssues.push(...issues);
          }

          await onProgress({
            phase: 'field_level',
            phaseLabel: '字段级校验',
            batchNumber: completedBatches + bi + 1,
            totalBatches: fieldTotal,
            phaseProgress: Math.round(phaseProgress),
            totalProgress,
            issues: fieldIssues.slice(-50),
          });
        }
        completedBatches += rowChunks.length;
      }
    }
  }

  // --- Phase 2: 记录级规则 ---
  const recordRules = parsedRules.filter(r => r.level === 'record');
  const recordTotal = countTotalBatches('record_level', assets, recordRules);
  let recordIssues: RuleIssue[] = [];

  if (recordRules.length > 0) {
    for (const asset of assets) {
      for (const [sheetName, rows] of asset.sheets) {
        const matchingRules = recordRules.filter(r => !r.tableName || sheetName.includes(r.tableName));
        if (matchingRules.length === 0) continue;

        const rowChunks = chunkRows(rows, batchSize);
        for (let bi = 0; bi < rowChunks.length; bi++) {
          const chunk = rowChunks[bi];
          const phaseProgress = ((bi + 1) / rowChunks.length) * 100;
          const totalProgress = Math.round(((completedBatches + bi + 1) / recordTotal) * 100);

          for (const rule of matchingRules) {
            const issues = executeRule(rule, sheetName, chunk);
            allIssues.push(...issues);
            recordIssues.push(...issues);
          }

          await onProgress({
            phase: 'record_level',
            phaseLabel: '记录级校验',
            batchNumber: completedBatches + bi + 1,
            totalBatches: recordTotal,
            phaseProgress: Math.round(phaseProgress),
            totalProgress,
            issues: recordIssues.slice(-50),
          });
        }
        completedBatches += rowChunks.length;
      }
    }
  }

  // --- Phase 3: 跨数据级规则 ---
  const crossRules = parsedRules.filter(r => r.level === 'cross_dataset');
  const crossTotal = countCrossBatches(assets, crossRules);
  const crossIssues: RuleIssue[] = [];

  if (crossRules.length > 0) {
    // Collect all sheets
    const allSheets = new Map<string, Record<string, unknown>[]>();
    for (const asset of assets) {
      for (const [name, rows] of asset.sheets) {
        allSheets.set(name, rows);
      }
    }

    // Cross-table: build reference sets once
    const refSets = new Map<string, Set<string>>();
    for (const rule of crossRules) {
      if (rule.executableType === 'cross_table') {
        const refTable = rule.executableParams.refTable as string | undefined;
        const refField = rule.executableParams.refField as string | undefined;
        if (refTable && refField) {
          const refSheet = [...allSheets.entries()].find(([n]) => n.includes(refTable));
          if (refSheet) {
            const values = new Set(refSheet[1].map(r => String(r[refField] ?? '').trim()));
            refSets.set(`${refTable}.${refField}`, values);
          }
        }
      }
    }

    // Process cross-table rules per sheet/chunk
    const crossTableRules = crossRules.filter(r => r.executableType === 'cross_table');
    if (crossTableRules.length > 0) {
      for (const [sheetName, rows] of allSheets) {
        const matchingRules = crossTableRules.filter(r => !r.tableName || sheetName.includes(r.tableName));
        if (matchingRules.length === 0) continue;

        const rowChunks = chunkRows(rows, batchSize);
        for (let bi = 0; bi < rowChunks.length; bi++) {
          const chunk = rowChunks[bi];
          const globalStartIndex = bi * batchSize;
          const phaseProgress = ((bi + 1) / rowChunks.length) * 100;
          const totalProgress = Math.round(((completedBatches + bi + 1) / crossTotal) * 100);

          for (const rule of matchingRules) {
            const issues = executeCrossTableRule(rule, sheetName, chunk, globalStartIndex, refSets);
            allIssues.push(...issues);
            crossIssues.push(...issues);
          }

          await onProgress({
            phase: 'cross_level',
            phaseLabel: '跨数据级校验',
            batchNumber: completedBatches + bi + 1,
            totalBatches: crossTotal,
            phaseProgress: Math.round(phaseProgress),
            totalProgress,
            issues: crossIssues.slice(-50),
          });
        }
        completedBatches += rowChunks.length;
      }
    }

    // Process aggregation rules (single pass, no chunking needed)
    const aggRules = crossRules.filter(r => r.executableType === 'cross_aggregation' || r.executableParams.aggFunc);
    if (aggRules.length > 0) {
      for (const rule of aggRules) {
        const issues = executeCrossAggregationRule(rule, allSheets);
        allIssues.push(...issues);
        crossIssues.push(...issues);
      }

      await onProgress({
        phase: 'cross_level',
        phaseLabel: '跨数据级校验',
        batchNumber: completedBatches + 1,
        totalBatches: crossTotal,
        phaseProgress: 100,
        totalProgress: Math.round(((completedBatches + 1) / crossTotal) * 100),
        issues: crossIssues.slice(-50),
      });
      completedBatches += 1;
    }
  }

  return allIssues;
}
