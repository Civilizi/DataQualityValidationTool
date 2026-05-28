import * as XLSX from 'xlsx';
import type { ValidationResultRow } from '../types/database';

/** Excel 颜色定义 */
const COLORS = {
  error: { fill: 'FFC7CE', text: '9C0006' },      // 红色背景
  warning: { fill: 'FFEB9C', text: '9C6500' },     // 黄色背景
  info: { fill: 'BDD7EE', text: '1F4D78' },        // 蓝色背景
};

/**
 * 将校验结果导出为带颜色标记的 Excel Buffer。
 * 严重=红色背景, 警告=黄色背景, 提示=蓝色背景。
 */
export async function exportResultsToExcel(
  results: ValidationResultRow[],
  taskName: string,
): Promise<Buffer> {
  // Prepare data rows
  const headers = ['严重等级', '校验阶段', '工作表', '行号', '字段名', '原始值', '问题描述', 'AI 诊断', 'AI 建议'];
  const rows = results.map(r => [
    r.severity === 'error' ? '严重' : r.severity === 'warning' ? '警告' : '提示',
    r.phase === 'field_level' ? '字段级' : r.phase === 'record_level' ? '记录级' : '跨数据级',
    r.sheet_name ?? '-',
    r.row_index ?? '-',
    r.field_name ?? '-',
    r.original_value ?? '-',
    r.issue_description ?? '-',
    r.ai_diagnosis ?? '-',
    r.ai_suggestion ?? '-',
  ]);

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Apply cell styles based on severity
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = 1; R <= range.e.r; R++) {
    const result = results[R - 1];
    if (!result) continue;
    const color = COLORS[result.severity as keyof typeof COLORS] || COLORS.warning;

    for (let C = range.s.c; C <= range.e.c; C++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellRef]) continue;

      ws[cellRef].s = {
        fill: {
          patternType: 'solid',
          fgColor: { rgb: color.fill },
        },
        font: {
          color: { rgb: color.text },
          bold: false,
        },
      };
    }
  }

  // Style header row
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellRef]) continue;
    ws[cellRef].s = {
      fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } },
      font: { color: { rgb: 'FFFFFF' }, bold: true },
    };
  }

  // Column widths
  ws['!cols'] = [
    { wch: 10 },  // 严重等级
    { wch: 10 },  // 校验阶段
    { wch: 20 },  // 工作表
    { wch: 8 },   // 行号
    { wch: 15 },  // 字段名
    { wch: 20 },  // 原始值
    { wch: 40 },  // 问题描述
    { wch: 30 },  // AI 诊断
    { wch: 30 },  // AI 建议
  ];

  XLSX.utils.book_append_sheet(wb, ws, '校验结果');

  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}
