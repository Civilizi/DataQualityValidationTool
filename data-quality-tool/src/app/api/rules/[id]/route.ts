import { success, error, notFound } from '@/app/api/response';
import { updateRule, deleteRule } from '@/lib/db/repository';
import { all } from '@/lib/db';
import type { ValidationRuleRow } from '@/types/database';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rules = await all<ValidationRuleRow>(
      'SELECT * FROM validation_rules WHERE id = ?',
      [id],
    );
    if (rules.length === 0) {
      return notFound('规则不存在');
    }
    return success(rules[0]);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await updateRule(id, body);
    const rules = await all<ValidationRuleRow>(
      'SELECT * FROM validation_rules WHERE id = ?',
      [id],
    );
    if (rules.length === 0) {
      return notFound('规则不存在');
    }
    return success(rules[0]);
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
    await deleteRule(id);
    return success(null);
  } catch (e: any) {
    return error(e.message);
  }
}
