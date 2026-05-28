import { success, error, notFound, badRequest } from '@/app/api/response';
import { fieldAliases, auditLogs } from '@/lib/db/repository';

export async function GET() {
  try {
    const aliases = await fieldAliases.getAll();
    return success(aliases);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { standardName, alias, domainId } = body;

    if (!standardName || !alias) {
      return badRequest('standardName 和 alias 不能为空');
    }

    const created = await fieldAliases.create({
      standardName,
      alias,
      domainId,
    });

    await auditLogs.create(
      domainId,
      'create',
      'field_alias',
      created.id,
      { standardName, alias },
    );

    return success(created, 201);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return badRequest('id 参数不能为空');
    }

    const deleted = await fieldAliases.delete(id);
    if (!deleted) {
      return notFound('别名不存在');
    }

    await auditLogs.create(
      undefined,
      'delete',
      'field_alias',
      id,
      undefined,
    );

    return success({ deleted: true });
  } catch (e: any) {
    return error(e.message);
  }
}
