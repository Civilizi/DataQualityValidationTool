import type { ChatMessage } from '../dashscope';

const SYSTEM_PROMPT = `你是数据质量解析专家。你的任务是将 Excel 文件中的数据质量规则从自然语言转换为结构化 JSON。

你的工作：
1. 仔细阅读用户提供的 Excel 文件内容，其中包含自然语言描述的数据质量规则
2. 识别表格结构（哪一列是表名、字段名、规则描述、数据质量维度、严重级别等）
3. 将每条规则解析为结构化格式
4. 输出一个 JSON 数组

输出格式要求 - 每个规则对象包含以下字段：
- tableName: 表名（如无法识别则为 null）
- fieldName: 字段名（如无法识别则为 null）
- dimension: 数据质量维度，可选值：完整性、准确性、一致性、及时性、唯一性、有效性（如无法确定则为 null）
- level: 规则级别，可选值：字段级、记录级、跨表级（如无法确定则为 null）
- originalText: 原始规则文本（必须保留原文）
- executableType: 可执行类型，可选值：not_null、not_empty、length_range、format_regex、value_range、unique、cross_table_check、custom（如无法确定则为 "custom"）
- executableParams: 可执行参数，JSON 对象（如无法确定则为 null）
- severity: 严重程度，可选值：error、warning、info（默认为 warning）

请直接输出 JSON 数组，不要包含任何额外的解释文本。`;

export function buildStandardParsePrompt(standardContent: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请解析以下数据质量标准文件内容，将每条规则转换为结构化格式：

${standardContent}`,
    },
  ];
}
