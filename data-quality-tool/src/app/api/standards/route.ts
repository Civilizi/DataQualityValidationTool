import { success, error, badRequest } from '@/app/api/response';
import {
  dataStandards,
  validationRules,
  auditLogs,
  getNextVersion,
  getStandardById,
  getStandardsByDomain,
} from '@/lib/db/repository';
import { getDb } from '@/lib/db';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const STANDARDS_DIR = path.join(UPLOAD_DIR, 'standards');

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const domainId = url.searchParams.get('domainId');
    const status = url.searchParams.get('status');

    if (!domainId) {
      return badRequest('domainId 参数不能为空');
    }

    let standards = domainId === 'all'
      ? await dataStandards.getAll()
      : await getStandardsByDomain(domainId);

    if (status) {
      standards = standards.filter((s) => s.parse_status === status);
    }

    // Enrich each standard with rule count
    const db = await getDb();
    const enriched = await Promise.all(
      standards.map(async (standard) => {
        const rows = db.exec(
          'SELECT COUNT(*) as cnt FROM validation_rules WHERE standard_id = ?',
          [standard.id],
        );
        const ruleCount = rows[0]?.values[0]?.[0] as number ?? 0;
        return { ...standard, ruleCount };
      }),
    );

    return success(enriched);
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

    // Ensure upload directory exists
    if (!fs.existsSync(STANDARDS_DIR)) {
      fs.mkdirSync(STANDARDS_DIR, { recursive: true });
    }

    // Read file buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-一-鿿]/g, '_')}`;
    const filePath = path.join(STANDARDS_DIR, safeFileName);
    fs.writeFileSync(filePath, buffer);

    // Calculate file hash
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

    // Parse Excel to get metadata
    const workbook = XLSX.read(buffer);
    const sheetCount = workbook.SheetNames.length;
    let rowCount = 0;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      rowCount += XLSX.utils.sheet_to_json(sheet).length;
    }

    // Determine standard name from file name (without extension)
    const standardName = path.parse(fileName).name;

    // Get next version for this name in this domain
    const version = await getNextVersion(domainId, standardName);

    // Create data_standards record
    const standard = await dataStandards.create({
      domain_id: domainId,
      name: standardName,
      display_name: standardName,
      version,
      file_path: filePath,
      file_size: buffer.length,
      file_hash: fileHash,
      parse_status: 'pending',
      total_rules: 0,
      confirmed_rules: 0,
    });

    // Create audit log
    await auditLogs.create(
      domainId,
      'standard_upload',
      'data_standard',
      standard.id,
      {
        file_name: fileName,
        file_size: buffer.length,
        sheet_count: sheetCount,
        row_count: rowCount,
        version,
      },
    );

    return success(
      {
        ...standard,
        sheetCount,
        rowCount,
      },
      201,
    );
  } catch (e: any) {
    return error(`文件上传失败: ${e.message}`);
  }
}
