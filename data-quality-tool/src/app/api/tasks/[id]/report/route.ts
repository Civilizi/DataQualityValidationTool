import { success, error, notFound, badRequest } from '@/app/api/response';
import { validationTasks } from '@/lib/db/repository';
import { generateReport } from '@/lib/ai/report';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const task = await validationTasks.getById(id);
    if (!task) {
      return notFound('任务不存在');
    }
    if (task.status !== 'completed') {
      return badRequest('任务尚未完成，无法生成报告');
    }

    const reportContent = await generateReport(id);

    return success({
      taskId: id,
      taskName: task.name,
      content: reportContent,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return error(`报告生成失败: ${e.message}`);
  }
}
