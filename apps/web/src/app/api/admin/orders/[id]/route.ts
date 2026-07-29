import { NextRequest } from 'next/server';
import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  // In Next.js 14/15, params can be a promise or object, so we await it just in case, or just read it.
  const resolvedParams = await params;
  return passJson(
    await adminBackendFetch(`/admin/orders/${resolvedParams.id}`, { method: 'DELETE' })
  );
}
