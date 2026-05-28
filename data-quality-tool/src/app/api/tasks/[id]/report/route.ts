import { success, error, notFound, badRequest } from '@/app/api/response';
import { validationTasks } from '@/lib/db/repository';
import { deliverables } from '@/lib/db/deliverables';
import { generateReport } from '@/lib/ai/report';
import fs from 'fs';
import path from 'path';

const REPORTS_DIR = process.env.REPORT_DIR ?? path.join(process.cwd(), 'data', 'reports');

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

    // Save report to disk
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    const fileName = `${task.name}_${new Date().toISOString().slice(0, 10)}.md`;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-一-鿿]/g, '_');
    const filePath = path.join(REPORTS_DIR, safeFileName);
    fs.writeFileSync(filePath, reportContent, 'utf-8');

    // Get next version
    const existing = await deliverables.getByTask(id);
    const version = existing.filter(d => d.type === 'report').length + 1;

    // Save as deliverable
    const d = await deliverables.create({
      task_id: id,
      version,
      type: 'report',
      file_path: filePath,
      file_size: Buffer.byteLength(reportContent, 'utf-8'),
      description: `质量分析报告 v${version}`,
    });

    return success({
      taskId: id,
      taskName: task.name,
      content: reportContent,
      deliverableId: d.id,
      version: d.version,
      generatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return error(`报告生成失败: ${e.message}`);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const items = await deliverables.getByTask(id);
    return success(items);
  } catch (e: any) {
    return error(e.message);
  }
}
