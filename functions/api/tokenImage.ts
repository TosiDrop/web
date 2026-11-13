import type { Env } from '../types/env';
import {
  vmConfig,
  vmGet,
  deploymentCacheKey,
  deploymentNetwork,
  vmConfigurationErrorResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';
import { readResponseBodyWithLimit } from '../../src/shared/readLimitedBody';
import { fetchRegistryLogo } from '../../src/shared/tokenRegistry';

const MAX_ID_LEN = 120;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const TOKENS_CACHE_KEY = '__internal:tokens_cache';

interface TokenInfo {
  logo?: unknown;
}

function hasBucket(env: Env): env is Env & { TOKEN_IMAGES: R2Bucket } {
  return typeof env?.TOKEN_IMAGES?.get === 'function';
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}

const IMMUTABLE = 'public, max-age=31536000, immutable';

function image(body: BodyInit, contentType: string): Response {
  return new Response(body, { headers: { 'Content-Type': contentType, 'Cache-Control': IMMUTABLE } });
}

// Fallback for logos that are missing from VM metadata or broken upstream.
async function registryLogo(env: Env, assetId: string): Promise<ArrayBuffer | null> {
  try {
    return await fetchRegistryLogo(assetId, deploymentNetwork(env), MAX_IMAGE_BYTES);
  } catch (err) {
    console.error('tokenImage registry error:', err);
    return null;
  }
}

// Only URLs registered in token metadata are ever fetched — the caller cannot
// supply one, which keeps this proxy SSRF-free.
async function resolveLogo(env: Env, assetId: string): Promise<string | null> {
  let tokens = (await env.VM_WEB_PROFILES.get(deploymentCacheKey(env, TOKENS_CACHE_KEY), { type: 'json' })) as
    | Record<string, TokenInfo>
    | null;
  if (!tokens) {
    tokens = (await vmGet(env, 'get_tokens')) as Record<string, TokenInfo>;
  }
  const logo = tokens?.[assetId]?.logo;
  return typeof logo === 'string' && /^https?:\/\//i.test(logo) ? logo : null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const id = new URL(request.url).searchParams.get('id');

  if (!id || id.length > MAX_ID_LEN) {
    return errorResponse('id is required', 400, origin);
  }

  if (!vmConfig(env)) return vmConfigurationErrorResponse(origin);

  let logo: string | null;
  try {
    logo = await resolveLogo(env, id);
  } catch (err) {
    console.error('tokenImage metadata error:', err);
    return errorResponse('Failed to resolve token', 500, origin);
  }
  const bucket = hasBucket(env) ? env.TOKEN_IMAGES : null;
  // Without a cache there is nothing to fill, so send known logos straight to their source.
  if (logo && !bucket) return redirect(logo);

  const objectKey = deploymentCacheKey(env, id);

  if (bucket) {
    try {
      const cached = await bucket.get(objectKey);
      if (cached) return image(cached.body, cached.httpMetadata?.contentType ?? 'application/octet-stream');
    } catch (err) {
      console.error('tokenImage R2 read error:', err);
    }
  }

  if (logo && bucket) {
    try {
      const upstream = await fetch(logo, { signal: AbortSignal.timeout(10_000) });
      const contentType = upstream.headers.get('Content-Type') ?? '';
      if (upstream.ok && contentType.startsWith('image/')) {
        const bytes = await readResponseBodyWithLimit(upstream, MAX_IMAGE_BYTES);
        // An oversized logo is still a real logo; let the browser load it from the source.
        if (!bytes) return redirect(logo);
        await bucket.put(objectKey, bytes, { httpMetadata: { contentType } });
        return image(bytes, contentType);
      }
    } catch (err) {
      console.error('tokenImage upstream error:', err);
    }
  }

  const registered = await registryLogo(env, id);
  if (registered) {
    try {
      await bucket?.put(objectKey, registered, { httpMetadata: { contentType: 'image/png' } });
    } catch (err) {
      console.error('tokenImage R2 write error:', err);
    }
    return image(registered, 'image/png');
  }

  if (logo) return redirect(logo);
  const missing = errorResponse('Unknown token or no image', 404, origin);
  // Tokens without any image ask again at most daily.
  missing.headers.set('Cache-Control', 'public, max-age=86400');
  return missing;
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
