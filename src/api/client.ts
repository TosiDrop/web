import { ApiError } from '@/types/api';

async function throwApiError(res: Response): never {
  let message: string;
  try {
    const body = (await res.json()) as Record<string, string>;
    message = body.error || body.message || res.statusText;
  } catch {
    message = res.statusText;
  }
  throw new ApiError(message, res.status);
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) await throwApiError(res);
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res);
  return res.json() as Promise<T>;
}

export const apiClient = { get: apiGet, post: apiPost };
