import type { Env } from '../types/env';

export const DEFAULT_VM_BASE_URL = 'https://vmprev.adaseal.eu';

const ALLOWED_ORIGINS = [
  'https://tosidrop.io',
  'https://www.tosidrop.io',
  'http://localhost:5173',
  'http://localhost:8788',
];

function vmBaseUrl(env: Env): string {
  return env.VM_BASE_URL || DEFAULT_VM_BASE_URL;
}

// vm-sdk ships `checkStatusCustomRequest` but does not re-export it from its
// index, so we call the VM API's generic `api.php?action=` entrypoint directly.
// Remove this shim if a future SDK release exports the function.
export async function vmApiGet(
  env: Env,
  action: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<unknown> {
  const qs = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    qs.append(k, String(v));
  }
  const res = await fetch(`${vmBaseUrl(env)}/api.php?${qs.toString()}`, {
    headers: { 'X-API-Token': env.VITE_VM_API_KEY },
  });
  if (!res.ok) throw new Error(`VM API ${res.status}: ${res.statusText}`);
  return res.json();
}

function getCorsOrigin(requestOrigin?: string | null): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
}

// Note: vm-sdk's setApiToken mutates module-level state. This is safe in
// single-request-per-isolate environments but could race under concurrent
// requests sharing an isolate. If the SDK adds per-instance config, prefer that.
export async function initVmSdk(env: Env) {
  const sdk = await import('vm-sdk');
  sdk.setApiToken(env.VITE_VM_API_KEY);
  return sdk;
}

export function requireApiKey(env: Env, requestOrigin?: string | null): Response | null {
  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500, requestOrigin);
  }
  return null;
}

export async function withCache(
  request: Request,
  ttl: number,
  fetchFn: () => Promise<unknown>,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString());
  const origin = request.headers.get('Origin');

  // Cache stores body + Cache-Control only (no CORS headers). The Cloudflare
  // Cache API does not honor Vary, so per-origin ACAO must be applied fresh
  // on every response to avoid leaking one caller's origin to another.
  const cached = await cache.match(cacheKey);
  if (cached) {
    const body = await cached.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${ttl}`,
        ...corsHeaders(origin),
      },
    });
  }

  const data = await fetchFn();
  const body = JSON.stringify(data);
  const cacheable = new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${ttl}`,
    },
  });
  const put = cache.put(cacheKey, cacheable);
  if (waitUntil) waitUntil(put);
  else await put;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${ttl}`,
      ...corsHeaders(origin),
    },
  });
}

function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

export function jsonResponse(data: unknown, status = 200, requestOrigin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(requestOrigin) },
  });
}

export function errorResponse(message: string, status = 500, requestOrigin?: string | null): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(requestOrigin) },
  });
}

export function optionsResponse(requestOrigin?: string | null): Response {
  return new Response(null, { status: 204, headers: corsHeaders(requestOrigin) });
}
