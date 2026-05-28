import { success, error, badRequest, notFound } from '@/app/api/response';
import { getUploadSession, updateUploadSession, dataAssets, auditLogs } from '@/lib/db/repository';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const CHUNKS_DIR = process.env.CHUNKS_DIR ?? path.join(process.cwd(), 'data', 'chunks');
const ASSETS_DIR = process.env.ASSETS_DIR ?? path.join(process.cwd(), 'data', 'assets');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, domainId } = body;

    if (!sessionId || !domainId) {
      return badRequest('sessionId, domainId 为必填项');
    }

    const session = await getUploadSession(sessionId);
    if (!session) {
      return notFound('上传会话不存在');
    }
    if (session.status === 'completed') {
      return badRequest('该上传会话已完成');
    }

    const uploaded: number[] = JSON.parse(session.uploaded_chunks);
    if (uploaded.length < session.total_chunks) {
      return badRequest(`分片尚未上传完整，已上传 ${uploaded.length}/${session.total_chunks}`);
    }

    if (!fs.existsSync(ASSETS_DIR)) {
      fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }
    const sessionDir = path.join(CHUNKS_DIR, sessionId);
    const finalPath = path.join(ASSETS_DIR, `${Date.now()}_${session.file_name.replace(/[^a-zA-Z0-9._-一-鿿]/g, '_')}`);

    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = path.join(sessionDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        return badRequest(`分片 ${i} 不存在`);
      }
      const chunkData = fs.readFileSync(chunkPath);
      writeStream.write(chunkData);
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', reject);
    });

    // Parse Excel to extract metadata
    const buffer = fs.readFileSync(finalPath);
    const workbook = XLSX.read(buffer);
    const sheetNames = workbook.SheetNames;
    let totalRows = 0;
    const allColumns = new Set<string>();

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (rows.length > 0) {
        totalRows += rows.length - 1;
        const firstRow = rows[0];
        if (Array.isArray(firstRow)) {
          firstRow.forEach((c: any) => c && allColumns.add(String(c).trim()));
        }
      }
    }

    const assetName = path.parse(session.file_name).name;

    // Get next version for this asset name in domain
    const assets = await dataAssets.getByDomain(domainId);
    const sameNameAssets = assets.filter(a => a.name === assetName);
    const nextVersion = sameNameAssets.length > 0
      ? Math.max(...sameNameAssets.map(a => a.version)) + 1
      : 1;

    const asset = await dataAssets.create({
      domain_id: domainId,
      name: assetName,
      display_name: assetName,
      version: nextVersion,
      file_path: finalPath,
      file_size: buffer.length,
      file_hash: session.file_hash,
      sheet_names: JSON.stringify(sheetNames),
      row_count: totalRows,
      column_names: JSON.stringify([...allColumns]),
      upload_status: 'completed',
    });

    await auditLogs.create(
      domainId,
      'asset_upload',
      'data_asset',
      asset.id,
      {
        file_name: session.file_name,
        file_size: buffer.length,
        sheet_count: sheetNames.length,
        row_count: totalRows,
        column_count: allColumns.size,
        upload_type: 'chunked',
        session_id: sessionId,
      },
    );

    // Clean up chunks
    fs.rmSync(sessionDir, { recursive: true, force: true });
    await updateUploadSession(sessionId, {
      asset_id: asset.id,
      status: 'completed',
    });

    return success({ ...asset, sheetNames, sessionId }, 201);
  } catch (e: any) {
    return error(`分片合并失败: ${e.message}`);
  }
}
