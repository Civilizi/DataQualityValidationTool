import { success, error, notFound, badRequest } from '@/app/api/response';
import { businessDomains, dataStandards, dataAssets, validationTasks, auditLogs } from '@/lib/db/repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const domain = await businessDomains.getById(id);
    if (!domain) {
      return notFound('业务域不存在');
    }
    return success(domain);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await businessDomains.getById(id);
    if (!existing) {
      return notFound('业务域不存在');
    }

    const body = await request.json();
    const { name, description, status } = body;

    // Check duplicate name if name is changing
    if (name && name !== existing.name) {
      const allDomains = await businessDomains.getAll();
      if (allDomains.some((d) => d.name === name)) {
        return badRequest('已存在同名的业务域');
      }
    }

    const updated = await businessDomains.update(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
    });
    return success(updated);
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
    const existing = await businessDomains.getById(id);
    if (!existing) {
      return notFound('业务域不存在');
    }

    // Check for related data
    const standards = await dataStandards.getByDomain(id);
    const assets = await dataAssets.getByDomain(id);
    const tasks = await validationTasks.getByDomain(id);
    const relatedCount = standards.length + assets.length + tasks.length;

    if (relatedCount > 0) {
      return badRequest(
        `该业务域下还有 ${relatedCount} 条关联数据（${standards.length} 个数据标准、${assets.length} 个数据资产、${tasks.length} 个校验任务），无法删除`,
      );
    }

    await businessDomains.delete(id);
    await auditLogs.create(id, 'delete', 'business_domain', id, { name: existing.name });
    return success({ deleted: true });
  } catch (e: any) {
    return error(e.message);
  }
}
