import { success, error, notFound } from '@/app/api/response';
import { deliverables } from '@/lib/db/deliverables';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const item = await deliverables.getById(id);
    if (!item) {
      return notFound('成果文件不存在');
    }

    if (!item.file_path || !fs.existsSync(item.file_path)) {
      return notFound('成果文件已被删除');
    }

    const buffer = fs.readFileSync(item.file_path);
    const ext = path.extname(item.file_path);
    const mimeTypeMap: Record<string, string> = {
      '.md': 'text/markdown',
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
      '.json': 'application/json',
    };
    const mimeType = mimeTypeMap[ext] || 'application/octet-stream';

    return new Response(buffer as any, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${path.basename(item.file_path)}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (e: any) {
    return error(`下载成果文件失败: ${e.message}`);
  }
}
