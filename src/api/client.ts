import { ApiError } from '@/types/api';
import { useNetworkStore } from '@/store/network-state';

async function throwApiError(res: Response): Promise<never> {
  let message: string;
  try {
    const body = (await res.json()) as Record<string, string>;
    message = body.error || body.message || res.statusText;
  } catch {
    message = res.statusText;
  }
  throw new ApiError(message, res.status);
}

function withNetwork(url: string): string {
  const network = useNetworkStore.getState().selectedNetwork;
  return `${url}${url.includes('?') ? '&' : '?'}network=${network}`;
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(withNetwork(url));
  if (!res.ok) await throwApiError(res);
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(withNetwork(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res);
  return res.json() as Promise<T>;
}

export const apiClient = { get: apiGet, post: apiPost };
