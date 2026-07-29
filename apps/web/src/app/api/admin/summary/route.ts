import { adminBackendFetch, passJson } from '@/lib/admin-session';

export async function GET() {
  return passJson(await adminBackendFetch('/admin/dashboard/summary'));
}
