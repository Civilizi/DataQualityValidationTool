import { success, error, notFound } from '@/app/api/response';
import { validationTasks, validationResults } from '@/lib/db/repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const task = await validationTasks.getById(id);
    if (!task) {
      return notFound('任务不存在');
    }

    const summary = await validationResults.getSummary(id);

    return success({ ...task, ...summary });
  } catch (e: any) {
    return error(e.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const task = await validationTasks.getById(id);
    if (!task) {
      return notFound('任务不存在');
    }

    // Delete associated results
    const db = await (await import('@/lib/db')).getDb();
    db.run('DELETE FROM validation_results WHERE task_id = ?', [id]);

    // Delete task
    await (await import('@/lib/db')).run('DELETE FROM validation_tasks WHERE id = ?', [id]);

    return success(null);
  } catch (e: any) {
    return error(e.message);
  }
}
