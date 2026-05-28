import { success, error, badRequest } from '@/app/api/response';
import {
  validationTasks,
  validationRules,
  getRulesByStandard,
  dataStandards,
  dataAssets,
  auditLogs,
} from '@/lib/db/repository';

export async function GET(request: Request) {
  try {
    const domainId = new URL(request.url).searchParams.get('domainId');
    if (!domainId) {
      return badRequest('domainId 参数不能为空');
    }
    const tasks = await validationTasks.getByDomain(domainId);
    return success(tasks);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, domainId, standardId, assetIds } = body;

    if (!name || !domainId || !standardId) {
      return badRequest('任务名称、业务域和标准为必填项');
    }
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return badRequest('请至少选择一个数据资产');
    }

    // Verify standard exists and has confirmed rules
    const standard = await dataStandards.getById(standardId);
    if (!standard) {
      return badRequest('标准不存在');
    }

    // Count confirmed rules
    const confirmedRules = await getRulesByStandard(standardId, 'confirmed');
    if (confirmedRules.length === 0) {
      return badRequest('该标准暂无已确认的规则，请先解析并确认校验规则');
    }

    // Verify assets exist
    const assets = await Promise.all(
      assetIds.map((id: string) => dataAssets.getById(id)),
    );
    const validAssets = assets.filter(Boolean);
    if (validAssets.length === 0) {
      return badRequest('选中的数据资产不存在');
    }

    // Create task
    const task = await validationTasks.create({
      domain_id: domainId,
      name,
      standard_id: standardId,
      standard_version: standard.version,
      status: 'pending',
      field_level_status: null,
      record_level_status: null,
      cross_level_status: null,
      progress: 0,
      current_phase: null,
      asset_ids: JSON.stringify(assetIds),
      field_mappings: null,
      total_records: 0,
      total_rules: confirmedRules.length,
      error_count: 0,
      warning_count: 0,
      info_count: 0,
      pass_rate: null,
      started_at: null,
      completed_at: null,
    });

    await auditLogs.create(
      domainId,
      'task_create',
      'validation_task',
      task.id,
      {
        name,
        standard_name: standard.display_name,
        standard_version: standard.version,
        asset_count: assetIds.length,
        rule_count: confirmedRules.length,
      },
    );

    return success(task, 201);
  } catch (e: any) {
    return error(`创建任务失败: ${e.message}`);
  }
}
