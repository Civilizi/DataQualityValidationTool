import { dashScope } from './dashscope';
import { validationTasks, getResultsByTask } from '@/lib/db/repository';

/**
 * 生成质量分析报告。
 * 收集任务信息、结果统计、AI 诊断汇总，调用 DashScope 生成完整报告。
 */
export async function generateReport(taskId: string): Promise<string> {
  const task = await validationTasks.getById(taskId);
  if (!task) throw new Error('任务不存在');

  const results = await getResultsByTask(taskId);

  // Calculate stats
  const totalRecords = task.total_records || 0;
  const totalRules = task.total_rules || 0;
  const errorCount = results.filter(r => r.severity === 'error').length;
  const warningCount = results.filter(r => r.severity === 'warning').length;
  const infoCount = results.filter(r => r.severity === 'info').length;
  const totalIssues = results.length;
  const passRate = totalRecords > 0 ? ((totalRecords - totalIssues) / totalRecords * 100).toFixed(1) : 'N/A';

  // Dimension breakdown
  const dimMap = new Map<string, number>();
  for (const r of results) {
    const key = r.phase || '未分类';
    dimMap.set(key, (dimMap.get(key) || 0) + 1);
  }
  const dimensionBreakdown = [...dimMap.entries()].map(([k, v]) => `  ${k}: ${v} 个问题`).join('\n');

  // Top issues with AI diagnosis
  const diagnosedIssues = results.filter(r => r.ai_diagnosis).slice(0, 20);
  const issueSummary = diagnosedIssues.map((r, i) =>
    `示例 ${i + 1}: [${r.severity}] 表 "${r.sheet_name}" 字段 "${r.field_name}" - ${r.issue_description}
  AI 诊断: ${r.ai_diagnosis}
  AI 建议: ${r.ai_suggestion || '待补充'}`,
  ).join('\n\n');

  const qualityRating = errorCount === 0
    ? '优秀'
    : errorCount <= 5
      ? '良好'
      : errorCount <= 20
        ? '一般'
        : '需要关注';

  const messages = [
    {
      role: 'system' as const,
      content: `你是数据质量分析报告撰写专家。请基于校验结果数据，生成一份结构清晰、专业客观的分析报告。

报告应包含以下章节（使用 Markdown 格式）：

# 数据质量分析报告

## 一、任务概述
- 任务名称、业务域、校验范围
- 使用的标准版本、数据资产概况

## 二、总体评估
- 数据通过率
- 整体质量评级（优秀/良好/一般/需要关注）
- 问题数量统计（严重/警告/提示）

## 三、问题分布分析
- 按校验阶段分布（字段级/记录级/跨数据级）
- 按严重等级分布
- 需要重点关注的领域

## 四、重点问题清单
- 列出典型的严重和警告问题（附 AI 诊断）
- 使用温和、建设性的语言描述

## 五、改进建议
- 针对发现的问题给出具体可操作的改进建议
- 按优先级排序

写作要求：
- 使用具体数字支撑观点
- 避免使用"违规"、"错误"、"不合规"等绝对化措辞
- 使用"建议关注"、"值得关注"、"建议核查"等建设性表述
- 输出完整的 Markdown 格式报告`,
    },
    {
      role: 'user' as const,
      content: `请基于以下校验结果生成数据质量分析报告：

任务名称: ${task.name}
标准版本: ${task.standard_version || '未知'}
数据量: ${totalRecords} 条记录
校验规则: ${totalRules} 条
通过率: ${passRate}%
质量评级: ${qualityRating}

问题统计:
  严重: ${errorCount}
  警告: ${warningCount}
  提示: ${infoCount}
  总计: ${totalIssues}

按校验阶段分布:
${dimensionBreakdown}

${issueSummary ? `典型问题（含 AI 诊断）:\n${issueSummary}` : '本次校验未发现数据质量问题。'}

请生成完整的分析报告。`,
    },
  ];

  const report = await dashScope.chat(messages, { maxTokens: 8000, temperature: 0.3 });
  if (!report) throw new Error('AI 生成报告失败');

  return report;
}
