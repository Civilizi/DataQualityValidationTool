import { success, error, badRequest, notFound } from '@/app/api/response';
import { validationRules } from '@/lib/db/repository';

export interface RuleDiff {
  id: string;
  table_name: string | null;
  field_name: string | null;
  dimension: string | null;
  level: string | null;
  original_text: string | null;
  executable_type: string | null;
  severity: string;
  status: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  oldSeverity?: string;
  oldType?: string;
  oldStatus?: string;
}

export interface VersionDiff {
  standardA: { id: string; name: string; version: number };
  standardB: { id: string; name: string; version: number };
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
  diffs: RuleDiff[];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const idA = url.searchParams.get('idA');
    const idB = url.searchParams.get('idB');

    if (!idA || !idB) {
      return badRequest('idA 和 idB 参数不能为空');
    }

    const [rulesA, rulesB] = await Promise.all([
      validationRules.getByStandard(idA),
      validationRules.getByStandard(idB),
    ]);

    // Build lookup maps by table_name + field_name + dimension
    const mapA = new Map<string, typeof rulesA[0]>();
    const mapB = new Map<string, typeof rulesA[0]>();

    const key = (r: typeof rulesA[0]) =>
      `${r.table_name ?? ''}||${r.field_name ?? ''}||${r.dimension ?? ''}`;

    for (const r of rulesA) mapA.set(key(r), r);
    for (const r of rulesB) mapB.set(key(r), r);

    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    const diffs: RuleDiff[] = [];

    for (const k of allKeys) {
      const ruleA = mapA.get(k);
      const ruleB = mapB.get(k);

      if (!ruleA && ruleB) {
        diffs.push({
          id: ruleB.id,
          table_name: ruleB.table_name,
          field_name: ruleB.field_name,
          dimension: ruleB.dimension,
          level: ruleB.level,
          original_text: ruleB.original_text,
          executable_type: ruleB.executable_type,
          severity: ruleB.severity,
          status: ruleB.status,
          changeType: 'added',
        });
      } else if (ruleA && !ruleB) {
        diffs.push({
          id: ruleA.id,
          table_name: ruleA.table_name,
          field_name: ruleA.field_name,
          dimension: ruleA.dimension,
          level: ruleA.level,
          original_text: ruleA.original_text,
          executable_type: ruleA.executable_type,
          severity: ruleA.severity,
          status: ruleA.status,
          changeType: 'removed',
        });
      } else if (ruleA && ruleB) {
        const modified =
          ruleA.executable_type !== ruleB.executable_type ||
          ruleA.severity !== ruleB.severity ||
          ruleA.status !== ruleB.status ||
          ruleA.original_text !== ruleB.original_text;

        diffs.push({
          id: ruleB.id,
          table_name: ruleB.table_name,
          field_name: ruleB.field_name,
          dimension: ruleB.dimension,
          level: ruleB.level,
          original_text: ruleB.original_text,
          executable_type: ruleB.executable_type,
          severity: ruleB.severity,
          status: ruleB.status,
          changeType: modified ? 'modified' : 'unchanged',
          oldSeverity: modified ? ruleA.severity : undefined,
          oldType: modified && ruleA.executable_type !== ruleB.executable_type ? (ruleA.executable_type ?? undefined) : undefined,
          oldStatus: modified && ruleA.status !== ruleB.status ? ruleA.status : undefined,
        });
      }
    }

    const summary = {
      added: diffs.filter(d => d.changeType === 'added').length,
      removed: diffs.filter(d => d.changeType === 'removed').length,
      modified: diffs.filter(d => d.changeType === 'modified').length,
      unchanged: diffs.filter(d => d.changeType === 'unchanged').length,
    };

    return success({ diffs, summary });
  } catch (e: any) {
    return error(`版本对比失败: ${e.message}`);
  }
}
