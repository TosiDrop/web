import type { Env } from '../types/env';

const ALLOWED_ORIGINS = [
  'https://tosidrop.io',
  'https://www.tosidrop.io',
  'http://localhost:5173',
  'http://localhost:8788',
];

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

export function requireApiKey(env: Env): Response | null {
  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500);
  }
  return null;
}

export async function withCache(
  request: Request,
  ttl: number,
  fetchFn: () => Promise<unknown>,
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = await fetchFn();
  const response = jsonResponse(data);
  response.headers.set('Cache-Control', `s-maxage=${ttl}`);
  await cache.put(cacheKey, response.clone());
  return response;
}

function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(requestOrigin),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
