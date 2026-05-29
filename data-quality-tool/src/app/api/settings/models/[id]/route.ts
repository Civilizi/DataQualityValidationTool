import { success, error, notFound } from '@/app/api/response';
import { all, run, get } from '@/lib/db';

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, provider, modelName, apiKey, apiBaseUrl, temperature, maxTokens, isDefault } = body;

    const existing = await get(
      'SELECT * FROM ai_configs WHERE id = ?',
      [id],
    );
    if (!existing) return notFound('模型配置不存在');

    // If setting as default, unset all others
    if (isDefault) {
      await run('UPDATE ai_configs SET is_default = 0');
    }

    const now = new Date().toISOString();
    await run(
      `UPDATE ai_configs SET name = ?, provider = ?, model = ?,
        api_base_url = ?, temperature = ?, max_tokens = ?,
        is_default = ?, updated_at = ? WHERE id = ?`,
      [
        name ?? existing.name,
        provider ?? existing.provider,
        modelName ?? existing.model,
        apiBaseUrl !== undefined ? apiBaseUrl : existing.api_base_url,
        temperature ?? existing.temperature,
        maxTokens ?? existing.max_tokens,
        isDefault ? 1 : 0,
        now,
        id,
      ],
    );

    const updated = await get('SELECT * FROM ai_configs WHERE id = ?', [id]) as Record<string, unknown> | undefined;
    return success({
      ...updated,
      model_name: (updated as any)?.model,
      api_key: maskApiKey((updated as any)?.api_key || ''),
    });
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
    const existing = await get('SELECT * FROM ai_configs WHERE id = ?', [id]);
    if (!existing) return notFound('模型配置不存在');

    // Don't allow deleting the last config
    const count = await all('SELECT COUNT(*) as cnt FROM ai_configs');
    if ((count[0] as any).cnt <= 1) {
      return error('不能删除最后一个模型配置');
    }

    // If deleting default, set another as default
    if (existing.is_default) {
      await run(
        "UPDATE ai_configs SET is_default = 1 WHERE id != ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1",
        [id],
      );
    }

    await run('DELETE FROM ai_configs WHERE id = ?', [id]);
    return success(null);
  } catch (e: any) {
    return error(e.message);
  }
}

/** Set as default model */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await get('SELECT * FROM ai_configs WHERE id = ?', [id]);
    if (!existing) return notFound('模型配置不存在');

    await run('UPDATE ai_configs SET is_default = 0');
    await run('UPDATE ai_configs SET is_default = 1, updated_at = ? WHERE id = ?', [
      new Date().toISOString(), id,
    ]);

    return success({ id, is_default: 1 });
  } catch (e: any) {
    return error(e.message);
  }
}
