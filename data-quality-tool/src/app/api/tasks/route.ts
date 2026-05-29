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
    const { name, domainId, standardId, ruleIds, assetIds } = body;

    if (!name || !domainId) {
      return badRequest('任务名称和业务域为必填项');
    }
    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return badRequest('请至少选择一个数据资产');
    }

    // Determine rules and standard version
    let totalRules: number;
    let standardVersion: number | null = null;
    if (ruleIds && ruleIds.length > 0) {
      totalRules = ruleIds.length;
      // Look up version from the first rule's standard
      if (ruleIds.length > 0 && standardId) {
        const std = await dataStandards.getById(standardId);
        if (std) standardVersion = std.version;
      }
    } else if (standardId) {
      const standard = await dataStandards.getById(standardId);
      if (!standard) {
        return badRequest('标准不存在');
      }
      const confirmedRules = await getRulesByStandard(standardId, 'confirmed');
      if (confirmedRules.length === 0) {
        return badRequest('该标准暂无已确认的规则，请先解析并确认校验规则');
      }
      totalRules = confirmedRules.length;
      standardVersion = standard.version;
    } else {
      return badRequest('请选择校验规则或标准');
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
      standard_id: standardId ?? null,
      standard_version: standardVersion,
      status: 'pending',
      field_level_status: null,
      record_level_status: null,
      cross_level_status: null,
      progress: 0,
      current_phase: null,
      asset_ids: JSON.stringify(assetIds),
      field_mappings: ruleIds ? JSON.stringify(ruleIds) : null,
      total_records: 0,
      total_rules: totalRules,
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
        rule_count: totalRules,
        asset_count: assetIds.length,
      },
    );

    return success(task, 201);
  } catch (e: any) {
    return error(`创建任务失败: ${e.message}`);
  }
}
