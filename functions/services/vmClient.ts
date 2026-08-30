import { normalizeDeploymentNetwork, type Network } from '../../src/shared/network';

export const DEFAULT_VM_BASE_URL = 'https://vmprev.adaseal.eu';

export interface VmEnv {
  VITE_NETWORK?: string;
  VITE_VM_API_KEY?: string;
  VM_BASE_URL?: string;
  VM_BASE_URL_MAINNET?: string;
  VM_API_KEY_MAINNET?: string;
  VM_BASE_URL_PREVIEW?: string;
  VM_API_KEY_PREVIEW?: string;
}

export function deploymentNetwork(env: Pick<VmEnv, 'VITE_NETWORK'>): Network {
  return normalizeDeploymentNetwork(env.VITE_NETWORK);
}

export function vmConfig(env: VmEnv): { baseUrl: string; apiKey: string } | null {
  const network = deploymentNetwork(env);
  const apiKey = network === 'mainnet'
    ? env.VM_API_KEY_MAINNET
    : env.VM_API_KEY_PREVIEW ?? env.VITE_VM_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  const baseUrl = network === 'mainnet'
    ? env.VM_BASE_URL_MAINNET
    : env.VM_BASE_URL_PREVIEW ?? env.VM_BASE_URL ?? DEFAULT_VM_BASE_URL;
  if (!baseUrl) return null;
  return {
    baseUrl,
    apiKey,
  };
}

export function vmConfigurationErrorResponse(requestOrigin?: string | null): Response {
  return errorResponse('Server configuration error', 500, requestOrigin ?? undefined);
}

export function deploymentCacheKey(env: Pick<VmEnv, 'VITE_NETWORK'>, base: string): string {
  return `${base}:${deploymentNetwork(env)}`;
}

export async function vmGet(
  env: VmEnv,
  action: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<unknown> {
  const config = vmConfig(env);
  if (!config) throw new Error('vm_configuration_error');
  const sdk = await import('vm-sdk');
  sdk.setApiToken(config.apiKey);
  const client = new sdk.GET_FROM_VM(config.baseUrl);
  return client.get(action, params);
}

const ALLOWED_ORIGINS = [
  'https://tosidrop.io',
  'https://www.tosidrop.io',
  'http://localhost:5173',
  'http://localhost:8788',
];

export { sessionIdFor } from '../../src/shared/claim/session';

function getCorsOrigin(requestOrigin?: string | null): string {
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return ALLOWED_ORIGINS[0];
}

export async function withCache(
  request: Request,
  env: Pick<VmEnv, 'VITE_NETWORK'>,
  ttl: number,
  fetchFn: () => Promise<unknown>,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<Response> {
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.set('__deployment_network', deploymentNetwork(env));
  const cacheKey = new Request(cacheUrl.toString());
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
