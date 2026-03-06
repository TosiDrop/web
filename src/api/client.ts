import type { ApiError } from '@/types/api';

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message: string;
    try {
      const body = (await res.json()) as Record<string, string>;
      message = body.error || body.message || res.statusText;
    } catch {
      message = res.statusText;
    }
    const error: ApiError = { message, status: res.status };
    throw error;
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message: string;
    try {
      const json = (await res.json()) as Record<string, string>;
      message = json.error || json.message || res.statusText;
    } catch {
      message = res.statusText;
    }
    const error: ApiError = { message, status: res.status };
    throw error;
  }
  return res.json() as Promise<T>;
}

export const apiClient = { get: apiGet, post: apiPost };
