import { success, error, badRequest } from '@/app/api/response';
import { run, all } from '@/lib/db';
import type { ValidationRuleRow } from '@/types/database';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const domainId = url.searchParams.get('domainId');
    const standardId = url.searchParams.get('standardId');
    const status = url.searchParams.get('status');
    const level = url.searchParams.get('level');

    if (!domainId && !standardId) {
      return badRequest('domainId 或 standardId 参数至少需要一个');
    }

    let rules: ValidationRuleRow[] = [];

    if (standardId) {
      if (status) {
        rules = await all<ValidationRuleRow>(
          'SELECT * FROM validation_rules WHERE standard_id = ? AND status = ? ORDER BY sort_order',
          [standardId, status],
        );
      } else {
        rules = await all<ValidationRuleRow>(
          'SELECT * FROM validation_rules WHERE standard_id = ? ORDER BY sort_order',
          [standardId],
        );
      }
    } else if (domainId) {
      rules = await all<ValidationRuleRow>(
        `SELECT r.* FROM validation_rules r
         JOIN data_standards s ON r.standard_id = s.id
         WHERE s.domain_id = ?
         ORDER BY r.sort_order`,
        [domainId],
      );
    }

    // Filter by level if provided
    if (level) {
      rules = rules.filter((r) => r.level === level);
    }

    // Filter by status if provided (when listing by domain, not by standard)
    if (status && !standardId) {
      rules = rules.filter((r) => r.status === status);
    }

    return success(rules);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/batch-confirm')) {
      const body = await request.json();
      const { ruleIds } = body;
      if (!ruleIds || !Array.isArray(ruleIds) || ruleIds.length === 0) {
        return badRequest('ruleIds 不能为空');
      }
      const placeholders = ruleIds.map(() => '?').join(', ');
      const now = new Date().toISOString();
      await run(
        `UPDATE validation_rules SET status = 'confirmed', confidence = 1, updated_at = ? WHERE id IN (${placeholders})`,
        [now, ...ruleIds],
      );
      return success(null);
    }
    return badRequest('不支持的操作');
  } catch (e: any) {
    return error(e.message);
  }
}
