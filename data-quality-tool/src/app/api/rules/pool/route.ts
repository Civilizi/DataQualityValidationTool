import { success, error } from '@/app/api/response';
import { getAllRules } from '@/lib/db/repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId') || undefined;
    const status = searchParams.get('status') || undefined;
    const standardId = searchParams.get('standardId') || undefined;

    const rules = await getAllRules({ domainId, status, standardId });
    return success(rules);
  } catch (e: any) {
    return error(e.message);
  }
}
