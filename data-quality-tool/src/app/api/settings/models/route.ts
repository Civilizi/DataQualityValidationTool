import { success, error, notFound, badRequest } from '@/app/api/response';
import { all, run, get } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { auditLogs } from '@/lib/db/repository';

/** Mask API key: show first 4 + **** + last 4 */
function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function GET() {
  try {
    const configs = await all(
      `SELECT id, name, provider, api_key, api_base_url, model as model_name,
              temperature, max_tokens, is_active, is_default, updated_at
       FROM ai_configs ORDER BY is_default DESC, updated_at DESC`,
    );
    return success(configs.map((c: any) => ({
      ...c,
      api_key: maskApiKey(c.api_key),
    })));
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, provider, modelName, apiKey, apiBaseUrl, temperature, maxTokens, isDefault } = body;

    if (!name || !provider || !modelName || !apiKey) {
      return badRequest('名称、提供商、模型名称和 API Key 为必填项');
    }

    // If setting as default, unset all others
    if (isDefault) {
      await run('UPDATE ai_configs SET is_default = 0');
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO ai_configs (id, name, provider, api_key, api_base_url, model,
        temperature, max_tokens, is_active, is_default, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, name, provider, apiKey, apiBaseUrl ?? null, modelName,
       temperature ?? 0.7, maxTokens ?? 4096, isDefault ? 1 : 0, now],
    );

    return success({
      id, name, provider, model_name: modelName, api_base_url: apiBaseUrl,
      temperature, max_tokens: maxTokens, is_default: isDefault ? 1 : 0, is_active: 1, updated_at: now,
      api_key: maskApiKey(apiKey),
    }, 201);
  } catch (e: any) {
    return error(e.message);
  }
}
