import { success, error, badRequest } from '@/app/api/response';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, apiKey, modelName, apiBaseUrl } = body;

    if (!apiKey || !modelName) {
      return badRequest('API Key 和模型名称为必填项');
    }

    const baseUrl = apiBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        return success({ connected: true, model: modelName });
      } else {
        const errBody = await res.json().catch(() => ({}));
        return error(errBody?.error?.message || `连接失败 (HTTP ${res.status})`);
      }
    } catch (e: any) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        return error('连接超时，请检查网络或 API 地址');
      }
      return error(`连接失败: ${e.message}`);
    }
  } catch (e: any) {
    return error(e.message);
  }
}
