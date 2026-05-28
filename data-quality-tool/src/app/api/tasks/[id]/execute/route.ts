import { success, error, notFound, badRequest } from '@/app/api/response';
import {
  validationTasks,
  validationRules,
  getRulesByStandard,
  dataAssets,
  validationResults,
  auditLogs,
} from '@/lib/db/repository';
import { executeValidation } from '@/lib/engine/executor';

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

    await validationTasks.updateStatus(id, 'running', {
      progress: 0,
      current_phase: '准备中',
    });

    const issues = await executeValidation(
      assetPaths,
      ruleRows.map(r => ({ id: r.id, dbRow: r as unknown as Record<string, unknown> })),
      async (phase, progress, newIssues) => {
        await validationTasks.updateProgress(id, progress, {
          error_count: newIssues.filter(i => i.severity === 'error').length,
          warning_count: newIssues.filter(i => i.severity === 'warning').length,
          info_count: newIssues.filter(i => i.severity === 'info').length,
        });
        await validationTasks.updateStatus(id, 'running', {
          current_phase: phase,
          progress,
        });
      },
    );

    for (const issue of issues) {
      await validationResults.create({
        task_id: id,
        rule_id: null,
        phase: 'field_level',
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

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

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
        { name: taskName, total_issues: issues.length, errorCount, warningCount, infoCount },
      );
    }

    return success({ issueCount: issues.length, errorCount, warningCount, infoCount });
  } catch (e: any) {
    if (taskId) {
      await validationTasks.updateStatus(taskId, 'failed', {
        current_phase: `执行失败: ${e.message}`,
      });
    }
    return error(`校验执行失败: ${e.message}`);
  }
}
