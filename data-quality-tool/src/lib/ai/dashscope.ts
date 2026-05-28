import OpenAI from 'openai';

// Chat message types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

class DashScopeService {
  private client: OpenAI | null = null;
  private config: { apiKey: string; baseUrl: string; model: string } | null = null;

  async init(config: { apiKey: string; baseUrl?: string; model?: string }) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: config.model || 'qwen-plus',
    };
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.client) {
      // Try to init from env
      const apiKey = process.env.DASHSCOPE_API_KEY;
      if (!apiKey) throw new Error('AI 服务未配置 API Key');
      await this.init({ apiKey });
    }
    const response = await this.client!.chat.completions.create({
      model: options?.model || this.config!.model,
      messages: messages as any,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 8000,
      response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
    });
    return response.choices[0].message.content || '';
  }

  async chatJson<T>(messages: ChatMessage[], options?: ChatOptions): Promise<T | null> {
    const content = await this.chat(messages, { ...options, jsonMode: true });
    try {
      return JSON.parse(content) as T;
    } catch {
      // Try to extract JSON from markdown code blocks
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        return JSON.parse(match[1]) as T;
      }
      return null;
    }
  }

  // Health check
  async testConnection(): Promise<boolean> {
    try {
      await this.chat([
        { role: 'user', content: '回复 OK' },
      ], { maxTokens: 10 });
      return true;
    } catch {
      return false;
    }
  }
}

export const dashScope = new DashScopeService();
