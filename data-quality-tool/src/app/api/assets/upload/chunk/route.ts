import { success, error, badRequest, notFound } from '@/app/api/response';
import { updateUploadSession, getUploadSession } from '@/lib/db/repository';
import fs from 'fs';
import path from 'path';

const CHUNKS_DIR = process.env.CHUNKS_DIR ?? path.join(process.cwd(), 'data', 'chunks');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string | null;
    const chunkIndexStr = formData.get('chunkIndex') as string | null;
    const chunk = formData.get('chunk') as File | null;

    if (!sessionId || chunkIndexStr === null || !chunk) {
      return badRequest('sessionId, chunkIndex, chunk 为必填项');
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    if (isNaN(chunkIndex)) {
      return badRequest('chunkIndex 必须为数字');
    }

    const session = await getUploadSession(sessionId);
    if (!session) {
      return notFound('上传会话不存在');
    }
    if (session.status === 'completed') {
      return badRequest('该上传会话已完成');
    }

    const uploaded: number[] = JSON.parse(session.uploaded_chunks);
    if (uploaded.includes(chunkIndex)) {
      return success({ uploaded: true, message: '该分片已上传' });
    }

    if (!fs.existsSync(CHUNKS_DIR)) {
      fs.mkdirSync(CHUNKS_DIR, { recursive: true });
    }
    const sessionDir = path.join(CHUNKS_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir);
    }

    const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
    const chunkPath = path.join(sessionDir, `chunk_${chunkIndex}`);
    fs.writeFileSync(chunkPath, chunkBuffer);

    uploaded.push(chunkIndex);
    await updateUploadSession(sessionId, { uploaded_chunks: JSON.stringify(uploaded) });

    return success({
      sessionId,
      uploadedCount: uploaded.length,
      totalChunks: session.total_chunks,
      completed: uploaded.length === session.total_chunks,
    });
  } catch (e: any) {
    return error(`分片上传失败: ${e.message}`);
  }
}
