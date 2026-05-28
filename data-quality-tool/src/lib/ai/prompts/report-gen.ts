import type { ChatMessage } from '../dashscope';

const SYSTEM_PROMPT = `你是数据质量分析报告撰写专家。你的任务是基于验证结果的汇总数据，生成一份结构清晰、易于理解的分析报告。

报告应包含以下章节：
1. 概述：验证任务的基本信息、验证范围
2. 总体评估：通过率、整体数据质量评级
3. 问题分布：按严重程度（error/warning/info）分布、按数据质量维度分布
4. 重点关注：需要特别关注的问题领域
5. 改进建议：具体的数据质量提升建议

写作要求：
- 使用客观、专业的语言
- 数据引用要准确，用具体数字支撑观点
- 避免使用"违规"、"错误"等绝对化措辞
- 使用"建议关注"、"值得关注"等建设性表述
- 提供可操作的改进建议

输出格式 - 纯文本 Markdown 格式的报告内容。`;

interface ReportInput {
  taskName: string;
  domainName?: string;
  totalRecords: number;
  totalRules: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  passRate?: number;
  issueSummary?: string;
  dimensionBreakdown?: string;
}

export function buildReportPrompt(input: ReportInput): ChatMessage[] {
  const extraInfo: string[] = [];
  if (input.issueSummary) extraInfo.push(`问题汇总：\n${input.issueSummary}`);
  if (input.dimensionBreakdown) extraInfo.push(`按维度分布：\n${input.dimensionBreakdown}`);

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请基于以下验证结果生成数据质量分析报告：

任务名称: ${input.taskName}
业务域: ${input.domainName ?? '未指定'}
验证数据量: ${input.totalRecords} 条记录
验证规则数: ${input.totalRules} 条
错误数 (error): ${input.errorCount}
警告数 (warning): ${input.warningCount}
提示数 (info): ${input.infoCount}
通过率: ${input.passRate !== undefined ? `${(input.passRate * 100).toFixed(1)}%` : '待计算'}
${extraInfo.length > 0 ? '\n' + extraInfo.join('\n') : ''}

请生成完整的分析报告。`,
    },
  ];
}
