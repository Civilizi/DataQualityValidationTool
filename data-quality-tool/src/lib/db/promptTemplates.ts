import { v4 as uuidv4 } from 'uuid';
import { run, all, get } from './index';
import type { PromptTemplateRow } from '../../types/database';

export const promptTemplates = {
  async create(input: Omit<PromptTemplateRow, 'id' | 'created_at' | 'updated_at' | 'version'>): Promise<PromptTemplateRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO prompt_templates
       (id, name, type, system_prompt, user_prompt_template, version, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [id, input.name, input.type, input.system_prompt, input.user_prompt_template ?? null, input.is_active ?? 1, now, now],
    );
    return (await get<PromptTemplateRow>('SELECT * FROM prompt_templates WHERE id = ?', [id]))!;
  },

  async getAll(): Promise<PromptTemplateRow[]> {
    return all<PromptTemplateRow>('SELECT * FROM prompt_templates ORDER BY type, name');
  },

  async getById(id: string): Promise<PromptTemplateRow | undefined> {
    return get<PromptTemplateRow>('SELECT * FROM prompt_templates WHERE id = ?', [id]);
  },

  async update(id: string, updates: Partial<PromptTemplateRow>): Promise<PromptTemplateRow | undefined> {
    const existing = await this.getById(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
    if (updates.system_prompt !== undefined) { fields.push('system_prompt = ?'); values.push(updates.system_prompt); }
    if (updates.user_prompt_template !== undefined) { fields.push('user_prompt_template = ?'); values.push(updates.user_prompt_template); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }

    // Bump version on any content change
    if (updates.system_prompt !== undefined || updates.user_prompt_template !== undefined) {
      fields.push('version = ?');
      values.push(existing.version + 1);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await run(`UPDATE prompt_templates SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const result = await run('DELETE FROM prompt_templates WHERE id = ?', [id]);
    return result.changes > 0;
  },
};
