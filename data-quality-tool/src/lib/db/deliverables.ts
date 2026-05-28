// ============================================================
// deliverables
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { run, all, get } from './index';
import type { DeliverableRow } from '../../types/database';

export const deliverables = {
  async create(input: Omit<DeliverableRow, 'id' | 'created_at'>): Promise<DeliverableRow> {
    const now = new Date().toISOString();
    const id = uuidv4();
    await run(
      `INSERT INTO deliverables
       (id, task_id, version, type, file_path, file_size, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.task_id, input.version ?? 1, input.type, input.file_path,
       input.file_size ?? null, input.description ?? null, now],
    );
    return (await get<DeliverableRow>('SELECT * FROM deliverables WHERE id = ?', [id]))!;
  },

  async getByTask(taskId: string): Promise<DeliverableRow[]> {
    return all<DeliverableRow>(
      'SELECT * FROM deliverables WHERE task_id = ? ORDER BY created_at DESC',
      [taskId],
    );
  },

  async getById(id: string): Promise<DeliverableRow | undefined> {
    return get<DeliverableRow>('SELECT * FROM deliverables WHERE id = ?', [id]);
  },

  async delete(id: string): Promise<boolean> {
    const result = await run('DELETE FROM deliverables WHERE id = ?', [id]);
    return result.changes > 0;
  },
};
