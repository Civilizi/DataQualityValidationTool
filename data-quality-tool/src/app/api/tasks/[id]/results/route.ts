import { success, error, notFound, badRequest } from '@/app/api/response';
import { validationResults, getResultsByTask } from '@/lib/db/repository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const phase = url.searchParams.get('phase');

    let results = await getResultsByTask(id);

    if (severity) {
      results = results.filter(r => r.severity === severity);
    }
    if (phase) {
      results = results.filter(r => r.phase === phase);
    }

    return success(results);
  } catch (e: any) {
    return error(e.message);
  }
}
