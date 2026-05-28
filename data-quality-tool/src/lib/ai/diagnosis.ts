import { dashScope } from './dashscope';
import { buildIssueDiagnosisPrompt } from './prompts/issue-diagnosis';
import { validationResults, getResultsByTask } from '@/lib/db/repository';

interface DiagnosisResult {
  diagnosis: string;
  suggestion: string;
}

/**
 * 对校验结果进行 AI 辅助诊断。
 * 按严重等级+维度分组，每组取代表性样本调用 AI，
 * 同类问题的诊断和建议可复用，节省 API 调用。
 */
export async function diagnoseIssues(taskId: string): Promise<void> {
  const results = await getResultsByTask(taskId);

  // Filter out already diagnosed
  const undiagnosed = results.filter(r => !r.ai_diagnosis);
  if (undiagnosed.length === 0) return;

  // Group by severity + phase for similar issues
  const groups = new Map<string, typeof undiagnosed>();
  for (const r of undiagnosed) {
    const key = `${r.severity}|${r.phase}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  for (const [groupKey, groupIssues] of groups) {
    // Take representative samples (first 5 unique descriptions)
    const seen = new Set<string>();
    const samples: typeof groupIssues = [];
    for (const issue of groupIssues) {
      if (!seen.has(issue.issue_description ?? '') && samples.length < 5) {
        seen.add(issue.issue_description ?? '');
        samples.push(issue);
      }
    }

    if (samples.length === 0) continue;

    // Build batch prompt for the group
    const sampleText = samples.map((s, i) =>
      `示例 ${i + 1}: 表 "${s.sheet_name}" 字段 "${s.field_name}" - ${s.issue_description}（原始值: ${s.original_value}）`,
    ).join('\n');

    try {
      const response = await dashScope.chatJson<Record<string, { diagnosis: string; suggestion: string }>>([
        {
          role: 'system',
          content: `你是数据质量分析师。请用温和、建设性的语言解释数据验证中发现的问题。

重要语言风格要求：
- 使用温和的建议语气，如"建议核查"、"可能存在异常"、"请确认"
- 绝对不要使用："违规"、"错误"、"整改"、"不合规" 等负面或对抗性措辞
- 将问题描述为"需要关注的事项"而非"问题"或"错误"
- 提供具体的改进建议而非仅仅指出问题

输出格式为 JSON 对象，key 为 "示例1"、"示例2" 等，每个 value 包含 diagnosis 和 suggestion 两个字段。`,
        },
        {
          role: 'user',
          content: `请对以下数据质量验证结果进行分析和解读：

${sampleText}

请为每个示例提供温和的分析和改进建议，输出 JSON 格式。`,
        },
      ], { maxTokens: 4000 });

      if (!response) continue;

      // Apply diagnosis to all issues in this group
      for (const issue of groupIssues) {
        // Find matching sample
        const sampleIdx = samples.findIndex(s => s.issue_description === issue.issue_description);
        const key = `示例${sampleIdx + 1}`;
        const diag = response[key] as DiagnosisResult | undefined;

        if (diag) {
          await validationResults.update(issue.id, {
            ai_diagnosis: diag.diagnosis,
            ai_suggestion: diag.suggestion,
          });
        }
      }
    } catch (e) {
      // AI call failed, skip this group silently
      console.error(`AI 诊断失败: ${groupKey}`, e);
    }
  }
}
