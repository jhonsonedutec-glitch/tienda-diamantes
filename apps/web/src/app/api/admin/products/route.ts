import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function GET() {
  return passJson(await adminBackendFetch('/admin/products'));
}

export async function POST(request: Request) {
  return passJson(
    await adminBackendFetch('/admin/products', {
      method: 'POST',
      body: await request.text(),
    }),
  );
}
