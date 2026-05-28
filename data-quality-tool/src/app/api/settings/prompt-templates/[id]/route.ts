import { success, error, notFound, badRequest } from '@/app/api/response';
import { promptTemplates } from '@/lib/db/promptTemplates';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await promptTemplates.getById(id);
    if (!existing) {
      return notFound('模板不存在');
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.type !== undefined) updates.type = body.type;
    if (body.systemPrompt !== undefined) updates.system_prompt = body.systemPrompt;
    if (body.userPromptTemplate !== undefined) updates.user_prompt_template = body.userPromptTemplate;
    if (body.isActive !== undefined) updates.is_active = body.isActive ? 1 : 0;

    const updated = await promptTemplates.update(id, updates);
    return success(updated);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return badRequest('模板名称已存在');
    }
    return error(e.message);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const deleted = await promptTemplates.delete(id);
    if (!deleted) {
      return notFound('模板不存在');
    }
    return success({ id });
  } catch (e: any) {
    return error(e.message);
  }
}
