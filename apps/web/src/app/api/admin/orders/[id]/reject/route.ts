import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return passJson(
    await adminBackendFetch(`/admin/orders/${id}/payment/reject`, {
      method: 'PATCH',
      body: await request.text(),
    }),
  );
}
