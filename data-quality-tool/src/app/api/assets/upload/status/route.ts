import { success, error, notFound, badRequest } from '@/app/api/response';
import { getUploadSession, deleteUploadSession, getAssetById } from '@/lib/db/repository';
import fs from 'fs';
import path from 'path';

const CHUNKS_DIR = process.env.CHUNKS_DIR ?? path.join(process.cwd(), 'data', 'chunks');

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) {
      return badRequest('sessionId 参数不能为空');
    }

    const session = await getUploadSession(sessionId);
    if (!session) {
      return notFound('上传会话不存在');
    }

    const uploaded: number[] = JSON.parse(session.uploaded_chunks);
    const status = {
      ...session,
      uploadedChunks: uploaded,
      uploadedCount: uploaded.length,
      completed: uploaded.length >= session.total_chunks,
    };

    return success(status);
  } catch (e: any) {
    return error(`查询上传状态失败: ${e.message}`);
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get('sessionId');
    if (!sessionId) {
      return badRequest('sessionId 参数不能为空');
    }

    const session = await getUploadSession(sessionId);
    if (!session) {
      return notFound('上传会话不存在');
    }

    // Clean up chunks
    const sessionDir = path.join(CHUNKS_DIR, sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    await deleteUploadSession(sessionId);
    return success({ message: '已取消上传' });
  } catch (e: any) {
    return error(`取消上传失败: ${e.message}`);
  }
}
