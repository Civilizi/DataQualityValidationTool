import { error, notFound } from '@/app/api/response';
import { validationTasks, getResultsByTask } from '@/lib/db/repository';
import { exportResultsToExcel } from '@/lib/export';

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

    const results = await getResultsByTask(id);

    const buffer = await exportResultsToExcel(results, task.name);

    return new Response(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${task.name}_校验结果.xlsx"`,
      },
    });
  } catch (e: any) {
    return error(`导出失败: ${e.message}`);
  }
}
