import { success, error, badRequest } from '@/app/api/response';
import { createUploadSession, getUploadSession } from '@/lib/db/repository';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileName, fileSize, chunkSize, domainId, fileHash } = body;

    if (!fileName || !fileSize || !domainId) {
      return badRequest('fileName, fileSize, domainId 为必填项');
    }

    const chunkSizeNum = chunkSize || 5 * 1024 * 1024; // 默认 5MB
    const totalChunks = Math.ceil(fileSize / chunkSizeNum);

    const sessionId = await createUploadSession({
      asset_id: null,
      file_name: fileName,
      file_size: fileSize,
      file_hash: fileHash ?? null,
      chunk_size: chunkSizeNum,
      total_chunks: totalChunks,
      uploaded_chunks: JSON.stringify([]),
      status: 'uploading',
      created_at: '',
      updated_at: '',
    });

    return success({ sessionId, totalChunks, chunkSize: chunkSizeNum });
  } catch (e: any) {
    return error(`初始化上传失败: ${e.message}`);
  }
}
