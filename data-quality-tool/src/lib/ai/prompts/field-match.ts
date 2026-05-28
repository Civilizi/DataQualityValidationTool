import type { ChatMessage } from '../dashscope';

const SYSTEM_PROMPT = `你是数据字段匹配专家。你的任务是将数据资产中的列名与数据质量标准中的字段名进行匹配。

你的工作：
1. 用户会提供两组字段信息：
   - 标准字段：来自数据质量标准，包含表名和字段名
   - 资产字段：来自上传的数据文件，包含列名
2. 你需要将资产字段与标准字段进行匹配，考虑以下因素：
   - 字段名语义相似性（如 "客户编号" 和 "customer_id"）
   - 字段别名（使用 field_aliases 表中定义的别名）
   - 数据类型一致性
3. 输出匹配结果

输出格式要求 - JSON 数组，每个匹配对象包含：
- standardTable: 标准表名
- standardField: 标准字段名
- assetColumn: 资产列名
- confidence: 匹配置信度（0-1 之间的小数）
- matchReason: 匹配理由简述

请直接输出 JSON 数组，不要包含任何额外的解释文本。`;

interface FieldMatchInput {
  standardFields: Array<{ table: string; field: string }>;
  assetColumns: string[];
  aliases?: Array<{ standardName: string; alias: string }>;
}

export function buildFieldMatchPrompt(input: FieldMatchInput): ChatMessage[] {
  const aliasesText = input.aliases
    ? `\n已知字段别名映射：\n${input.aliases.map(a => `  "${a.standardName}" <-> "${a.alias}"`).join('\n')}`
    : '';

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请进行字段匹配：

标准字段列表：
${input.standardFields.map(f => `  - 表: "${f.table}", 字段: "${f.field}"`).join('\n')}

资产列名列表：
${input.assetColumns.map(c => `  - "${c}"`).join('\n')}
${aliasesText}

请输出匹配结果。`,
    },
  ];
}
