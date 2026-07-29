import { NextRequest } from 'next/server';
import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.search;
  return passJson(await adminBackendFetch(`/admin/orders${query}`));
}
