import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return passJson(
    await adminBackendFetch(`/admin/orders/${id}/payment/approve`, {
      method: 'PATCH',
    }),
  );
}
