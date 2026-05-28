import { success, error, notFound } from '@/app/api/response';
import { getAssetById, deleteAsset } from '@/lib/db/repository';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const asset = await getAssetById(id);
    if (!asset) {
      return notFound('素材不存在');
    }
    return success(asset);
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
    await deleteAsset(id);
    return success(null);
  } catch (e: any) {
    return error(e.message);
  }
}
