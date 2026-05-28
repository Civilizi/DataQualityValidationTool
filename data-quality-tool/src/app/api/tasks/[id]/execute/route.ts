import { success, error, notFound, badRequest } from '@/app/api/response';
import {
  validationTasks,
  getRulesByStandard,
  dataAssets,
  validationResults,
  auditLogs,
  executionLogs,
} from '@/lib/db/repository';
import { executeValidation } from '@/lib/engine/executor';
import type { ProgressUpdate } from '@/lib/engine/executor';
import { diagnoseIssues } from '@/lib/ai/diagnosis';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let taskId: string | null = null;
  let taskDomainId: string | null = null;
  let taskName: string | null = null;

  try {
    const { id } = await params;
    taskId = id;

    const task = await validationTasks.getById(id);
    if (!task) {
      return notFound('任务不存在');
    }
    if (task.status === 'running') {
      return badRequest('任务正在执行中');
    }

    taskDomainId = task.domain_id;
    taskName = task.name;

    if (!task.standard_id) {
      return badRequest('任务未关联标准');
    }

    const ruleRows = await getRulesByStandard(task.standard_id, 'confirmed');
    if (ruleRows.length === 0) {
      return badRequest('该标准暂无已确认的规则');
    }

    const assetIdsArr: string[] = task.asset_ids ? JSON.parse(task.asset_ids) : [];
    if (assetIdsArr.length === 0) {
      return badRequest('任务未关联数据资产');
    }

    const assets = await Promise.all(assetIdsArr.map((aid: string) => dataAssets.getById(aid)));
    const assetPaths = assets.filter(Boolean).map(a => a!.file_path!).filter(Boolean);
    if (assetPaths.length === 0) {
      return badRequest('关联的资产文件不存在');
    }

    // Start task
    await validationTasks.updateStatus(id, 'running', {
      progress: 0,
      current_phase: '准备中',
    });

    let finalErrorCount = 0;
    let finalWarningCount = 0;
    let finalInfoCount = 0;
    let totalIssues = 0;

    // Progress callback: update task status and write execution log per batch
    const onProgress = async (update: ProgressUpdate) => {
      const logId = await executionLogs.create({
        task_id: id,
        phase: update.phase,
        batch_number: update.batchNumber,
        batch_size: update.issues.length,
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        error_message: null,
        checkpoint_data: JSON.stringify({
          totalProgress: update.totalProgress,
          issueCount: update.issues.length,
        }),
      });

      await validationTasks.updateStatus(id, 'running', {
        current_phase: update.phaseLabel,
        progress: update.totalProgress,
      });

      // Save batch issues to validation_results
      for (const issue of update.issues) {
        await validationResults.create({
          task_id: id,
          rule_id: null,
          phase: update.phase,
          sheet_name: issue.sheetName,
          row_index: issue.rowIndex,
          field_name: issue.fieldName,
          original_value: issue.originalValue,
          severity: issue.severity,
          issue_description: issue.issueDescription,
          ai_diagnosis: null,
          ai_suggestion: null,
        });
      }
    };

    // Execute validation
    const issues = await executeValidation(
      assetPaths,
      ruleRows.map(r => ({ id: r.id, dbRow: r as unknown as Record<string, unknown> })),
      onProgress,
    );

    totalIssues = issues.length;
    finalErrorCount = issues.filter(i => i.severity === 'error').length;
    finalWarningCount = issues.filter(i => i.severity === 'warning').length;
    finalInfoCount = issues.filter(i => i.severity === 'info').length;

    // AI 辅助诊断：对发现的问题进行智能分析和解读
    if (totalIssues > 0) {
      await validationTasks.updateStatus(id, 'running', {
        current_phase: 'AI 辅助分析中',
        progress: 95,
      });
      try {
        await diagnoseIssues(id);
      } catch (e: any) {
        // AI 诊断失败不影响任务完成
        console.error('AI 诊断失败:', e);
      }
    }

    // Complete task
    await validationTasks.updateStatus(id, 'completed', {
      progress: 100,
      current_phase: '已完成',
      completed_at: new Date().toISOString(),
    });

    if (taskDomainId) {
      await auditLogs.create(
        taskDomainId,
        'task_complete',
        'validation_task',
        id,
        {
          name: taskName,
          total_issues: totalIssues,
          error_count: finalErrorCount,
          warning_count: finalWarningCount,
          info_count: finalInfoCount,
        },
      );
    }

    return success({
      issueCount: totalIssues,
      errorCount: finalErrorCount,
      warningCount: finalWarningCount,
      infoCount: finalInfoCount,
    });
  } catch (e: any) {
    if (taskId) {
      await validationTasks.updateStatus(taskId, 'failed', {
        current_phase: `执行失败: ${e.message}`,
      });
    }
    return error(`校验执行失败: ${e.message}`);
  }
}
