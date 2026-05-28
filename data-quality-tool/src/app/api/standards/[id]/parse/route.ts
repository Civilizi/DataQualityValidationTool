import { success, error, notFound, badRequest } from '@/app/api/response';
import {
  getStandardById,
  updateStandard,
  validationRules,
  auditLogs,
} from '@/lib/db/repository';
import { dashScope } from '@/lib/ai/dashscope';
import { buildStandardParsePrompt } from '@/lib/ai/prompts/standard-parse';
import * as XLSX from 'xlsx';
import fs from 'fs';

interface ParsedRule {
  tableName?: string | null;
  fieldName?: string | null;
  dimension?: string | null;
  level?: string | null;
  originalText: string;
  executableType?: string | null;
  executableParams?: string | null;
  severity?: string;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const standard = await getStandardById(id);
    if (!standard) {
      return notFound('标准不存在');
    }

    if (!standard.file_path) {
      return badRequest('标准文件路径不存在，请重新上传文件');
    }

    // Read the Excel file from disk
    if (!fs.existsSync(standard.file_path)) {
      return badRequest('标准文件不存在于磁盘上');
    }

    const buffer = fs.readFileSync(standard.file_path);
    const workbook = XLSX.read(buffer);

    // Convert all sheets to text content
    const contentParts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      contentParts.push(`## Sheet: ${sheetName}`);
      contentParts.push(json.map((row) => row.join('\t')).join('\n'));
    }

    const excelContent = contentParts.join('\n\n');

    // Call DashScope AI to parse rules
    const messages = buildStandardParsePrompt(excelContent);
    const parsedRules = await dashScope.chatJson<ParsedRule[]>(messages);

    if (!parsedRules || !Array.isArray(parsedRules) || parsedRules.length === 0) {
      // AI failed to parse — update status and return empty
      await updateStandard(id, { parse_status: 'failed' } as any);
      return success({
        rules: [],
        message: 'AI 解析失败，未能识别到有效的规则。请检查文件格式或手动录入规则。',
      });
    }

    // Save parsed rules to validation_rules table
    const savedRules = await Promise.all(
      parsedRules.map((rule, index) =>
        validationRules.create({
          standard_id: id,
          table_name: rule.tableName ?? null,
          field_name: rule.fieldName ?? null,
          dimension: rule.dimension ?? null,
          level: rule.level ?? null,
          original_text: rule.originalText ?? null,
          executable_type: rule.executableType ?? null,
          executable_params:
            typeof rule.executableParams === 'string'
              ? rule.executableParams
              : rule.executableParams
                ? JSON.stringify(rule.executableParams)
                : null,
          severity: rule.severity ?? 'warning',
          confidence: 0,
          status: 'pending',
          sort_order: index,
        }),
      ),
    );

    // Update standard parse status and rule count
    await updateStandard(id, {
      parse_status: 'parsed',
      total_rules: savedRules.length,
    } as any);

    // Create audit log
    await auditLogs.create(
      standard.domain_id,
      'standard_parse',
      'data_standard',
      id,
      { rule_count: savedRules.length },
    );

    return success({
      rules: savedRules,
      count: savedRules.length,
    });
  } catch (e: any) {
    // On AI error, update status to failed
    try {
      const { id } = await _request.url
        .split('/')
        .reduceRight((_, part, i, arr) => (part ? arr[i - 1] : _), '') as any;
    } catch {
      // ignore
    }
    return error(`AI 解析失败: ${e.message}`);
  }
}
