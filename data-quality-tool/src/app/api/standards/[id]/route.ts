import { success, error, notFound } from '@/app/api/response';
import {
  getStandardById,
  deleteStandard,
  auditLogs,
  validationRules,
} from '@/lib/db/repository';
import { getDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const standard = await getStandardById(id);
    if (!standard) {
      return notFound('标准不存在');
    }

    // Get rules
    const rules = await validationRules.getByStandard(id);

    return success({ standard, rules });
  } catch (e: any) {
    return error(e.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const standard = await getStandardById(id);
    if (!standard) {
      return notFound('标准不存在');
    }

    // Delete associated rules first
    const db = await getDb();
    db.run('DELETE FROM validation_rules WHERE standard_id = ?', [id]);

    // Delete the standard
    await deleteStandard(id);

    // Create audit log
    await auditLogs.create(
      standard.domain_id,
      'standard_delete',
      'data_standard',
      id,
      { name: standard.name, version: standard.version },
    );

    return success(null);
  } catch (e: any) {
    return error(e.message);
  }
}
