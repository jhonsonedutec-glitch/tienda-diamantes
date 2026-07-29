import { adminBackendFetch } from '@/lib/admin-session';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const response = await adminBackendFetch(`/admin/orders/${id}/receipt`);
  if (!response.ok) {
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('content-type') ?? 'application/octet-stream');
  headers.set('Content-Disposition', response.headers.get('content-disposition') ?? 'inline');
  return new Response(await response.arrayBuffer(), { status: 200, headers });
}
