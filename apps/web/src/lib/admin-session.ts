let envUrl = import.meta.env.VITE_API_INTERNAL_URL;
if (envUrl && envUrl.includes('localhost') && window.location.hostname !== 'localhost') {
  envUrl = undefined;
}
export const apiInternalUrl = envUrl ?? 'https://tienda-cerebro.onrender.com/api/v1';

export const ADMIN_TOKEN_KEY = 'ff_admin_token';

export async function adminBackendFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
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
  });
}

