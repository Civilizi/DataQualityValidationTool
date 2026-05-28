import { success, error, notFound, badRequest } from '@/app/api/response';
import { promptTemplates } from '@/lib/db/promptTemplates';

export async function GET() {
  try {
    const templates = await promptTemplates.getAll();
    return success(templates);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, systemPrompt, userPromptTemplate } = body;

    if (!name || !type || !systemPrompt) {
      return badRequest('name, type, systemPrompt 为必填项');
    }

    const template = await promptTemplates.create({
      name,
      type,
      system_prompt: systemPrompt,
      user_prompt_template: userPromptTemplate ?? null,
      is_active: 1,
    });

    return success(template);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return badRequest('模板名称已存在');
    }
    return error(e.message);
  }
}
