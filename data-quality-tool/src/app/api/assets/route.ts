import { success, error, badRequest } from '@/app/api/response';
import { getAssetsByDomain, dataAssets, auditLogs } from '@/lib/db/repository';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const ASSETS_DIR = path.join(UPLOAD_DIR, 'assets');

export async function GET(request: Request) {
  try {
    const domainId = new URL(request.url).searchParams.get('domainId');
    if (!domainId) {
      return badRequest('domainId 参数不能为空');
    }
    const assets = await getAssetsByDomain(domainId);
    return success(assets);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const domainId = formData.get('domainId') as string | null;

    if (!file) {
      return badRequest('文件不能为空');
    }
    if (!domainId) {
      return badRequest('domainId 不能为空');
    }

    if (!fs.existsSync(ASSETS_DIR)) {
      fs.mkdirSync(ASSETS_DIR, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-一-鿿]/g, '_')}`;
    const filePath = path.join(ASSETS_DIR, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

    // Parse Excel to extract metadata
    const workbook = XLSX.read(buffer);
    const sheetNames = workbook.SheetNames;
    let totalRows = 0;
    const allColumns = new Set<string>();

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (rows.length > 0) {
        totalRows += rows.length - 1; // exclude header
        // Collect column names from first row
        const firstRow = rows[0];
        if (Array.isArray(firstRow)) {
          firstRow.forEach((c: any) => c && allColumns.add(String(c).trim()));
        }
      }
    }

    const assetName = path.parse(fileName).name;

    const asset = await dataAssets.create({
      domain_id: domainId,
      name: assetName,
      display_name: assetName,
      version: 1,
      file_path: filePath,
      file_size: buffer.length,
      file_hash: fileHash,
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
        file_name: fileName,
        file_size: buffer.length,
        sheet_count: sheetNames.length,
        row_count: totalRows,
        column_count: allColumns.size,
      },
    );

    return success({ ...asset, sheetNames }, 201);
  } catch (e: any) {
    return error(`素材上传失败: ${e.message}`);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return badRequest('id 参数不能为空');
    }
    await dataAssets.delete(id);
    return success(null);
  } catch (e: any) {
    return error(e.message);
  }
}
