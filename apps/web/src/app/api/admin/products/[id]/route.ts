import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return passJson(
    await adminBackendFetch(`/admin/products/${id}`, {
      method: 'PATCH',
      body: await request.text(),
    }),
  );
}
