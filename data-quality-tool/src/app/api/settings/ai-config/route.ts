import { success, error, notFound, badRequest } from '@/app/api/response';
import { aiConfigs, auditLogs } from '@/lib/db/repository';

/** Mask API key: show first 4 + **** + last 4 */
function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function GET() {
  try {
    const config = await aiConfigs.getActive();
    if (!config) {
      return notFound('尚未配置 AI 服务');
    }
    return success({
      ...config,
      api_key: maskApiKey(config.api_key),
    });
  } catch (e: any) {
    return error(e.message);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, apiBaseUrl, model, temperature, maxTokens } = body;

    if (!apiKey || !model) {
      return badRequest('apiKey 和 model 不能为空');
    }

    const saved = await aiConfigs.save({
      api_key: apiKey,
      api_base_url: apiBaseUrl ?? null,
      model,
      temperature: temperature ?? 0.1,
      max_tokens: maxTokens ?? 4000,
      is_active: 1,
    });

    await auditLogs.create(
      undefined,
      'update',
      'ai_config',
      saved.id,
      { model: saved.model },
    );

    return success({
      ...saved,
      api_key: maskApiKey(saved.api_key),
    });
  } catch (e: any) {
    return error(e.message);
  }
}
