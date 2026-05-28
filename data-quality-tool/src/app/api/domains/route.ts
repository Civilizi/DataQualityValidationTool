import { success, error, badRequest } from '@/app/api/response';
import { businessDomains } from '@/lib/db/repository';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const domains = await businessDomains.getAllWithCounts();
    return success(domains);
  } catch (e: any) {
    return error(e.message);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return badRequest('名称不能为空');
    }

    // Check for duplicate name
    const existing = await businessDomains.getAll();
    if (existing.some((d) => d.name === name)) {
      return badRequest('已存在同名的业务域');
    }

    const domain = await businessDomains.create({
      name,
      description: description ?? null,
      status: 'active',
    });
    return success(domain, 201);
  } catch (e: any) {
    return error(e.message);
  }
}
