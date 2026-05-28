import type { ChatMessage } from '../dashscope';

const SYSTEM_PROMPT = `你是数据质量分析师。你的任务是用温和、建设性的语言解释数据验证中发现的问题。

重要语言风格要求：
- 使用温和的建议语气，如"建议核查"、"可能存在异常"、"请确认"
- 绝对不要使用："违规"、"错误"、"整改"、"不合规" 等负面或对抗性措辞
- 将问题描述为"需要关注的事项"而非"问题"或"错误"
- 提供具体的改进建议而非仅仅指出问题
- 使用"数据完整性有待提升"代替"数据不完整"
- 使用"建议检查该字段的数据来源"代替"该字段数据有误"

输出格式 - JSON 对象：
{
  "diagnosis": "问题描述（温和语气）",
  "suggestion": "建议措施（建设性语气）"
}`;

interface IssueInput {
  tableName?: string;
  fieldName?: string;
  dimension?: string;
  severity: string;
  issueDescription: string;
  originalValue?: string;
}

export function buildIssueDiagnosisPrompt(input: IssueInput): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请对以下数据质量验证结果进行分析和解读：

表名: ${input.tableName ?? '未指定'}
字段: ${input.fieldName ?? '未指定'}
数据质量维度: ${input.dimension ?? '未指定'}
严重程度: ${input.severity}
问题描述: ${input.issueDescription}
原始值: ${input.originalValue ?? '未记录'}

请提供温和的分析和改进建议。`,
    },
  ];
}
