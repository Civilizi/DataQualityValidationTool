import { success, error, badRequest } from '@/app/api/response';
import { auditLogs } from '@/lib/db/repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const domainId = searchParams.get('domainId') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const page = searchParams.has('page') ? Number(searchParams.get('page')) : undefined;
    const pageSize = searchParams.has('pageSize') ? Number(searchParams.get('pageSize')) : undefined;

    // Validate numeric params
    if (page !== undefined && (isNaN(page) || page < 1)) {
      return badRequest('page 必须是正整数');
    }
    if (pageSize !== undefined && (isNaN(pageSize) || pageSize < 1)) {
      return badRequest('pageSize 必须是正整数');
    }

    const result = await auditLogs.query({
      domainId,
      from,
      to,
      action,
      page: page ?? 1,
      pageSize: pageSize ?? 20,
    });

    return success(result);
  } catch (e: any) {
    return error(e.message);
  }
}
