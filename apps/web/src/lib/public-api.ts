import type { PublicProduct } from '@ff/shared';

let pubEnvUrl = import.meta.env.VITE_PUBLIC_API_URL;
if (pubEnvUrl && pubEnvUrl.includes('localhost') && window.location.hostname !== 'localhost') {
  pubEnvUrl = undefined;
}
export const publicApiUrl = pubEnvUrl ?? 'https://tienda-cerebro.onrender.com/api/v1';

export async function getProducts(): Promise<PublicProduct[]> {
  try {
    const response = await fetch(`${publicApiUrl}/products`, {
      cache: 'no-store',
    });
    if (!response.ok) return [];
    return (await response.json()) as PublicProduct[];
  } catch {
    return [];
  }
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(' ');
    return data.message ?? 'No se pudo completar la operación.';
  } catch {
    return 'No se pudo completar la operación.';
  }
}
