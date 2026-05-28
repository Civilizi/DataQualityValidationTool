import { success, error, badRequest, notFound } from '@/app/api/response';
import { validationRules } from '@/lib/db/repository';
import { detectRuleConflicts } from '@/lib/engine/conflictDetector';

export async function GET(request: Request) {
  try {
    const standardId = new URL(request.url).searchParams.get('standardId');
    if (!standardId) {
      return badRequest('standardId 参数不能为空');
    }

    const rules = await validationRules.getByStandard(standardId);
    const ruleEntries = rules.map(r => ({ id: r.id, dbRow: r as unknown as Record<string, unknown> }));
    const conflicts = detectRuleConflicts(ruleEntries);

    return success(conflicts);
  } catch (e: any) {
    return error(e.message);
  }
}
