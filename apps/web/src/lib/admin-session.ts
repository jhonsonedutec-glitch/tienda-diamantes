import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'ff_admin_session';

const apiInternalUrl =
  process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1';

export async function adminBackendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return new Response(JSON.stringify({ message: 'Sesión no válida.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${apiInternalUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
}

export function passJson(response: Response) {
  return response.text().then(
    (body) =>
      new Response(body, {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}
