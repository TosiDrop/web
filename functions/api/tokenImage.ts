import type { Env } from '../types/env';
import { initVmSdk, errorResponse, optionsResponse } from '../services/vmClient';
import { readResponseBodyWithLimit } from '../../src/shared/readLimitedBody';

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

// Only URLs registered in token metadata are ever fetched — the caller cannot
// supply one, which keeps this proxy SSRF-free.
async function resolveLogo(env: Env, assetId: string): Promise<string | null> {
  let tokens = (await env.VM_WEB_PROFILES.get(TOKENS_CACHE_KEY, { type: 'json' })) as
    | Record<string, TokenInfo>
    | null;
  if (!tokens) {
    const sdk = await initVmSdk(env);
    tokens = (await sdk.getTokens()) as Record<string, TokenInfo>;
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

  let logo: string | null;
  try {
    logo = await resolveLogo(env, id);
  } catch (err) {
    console.error('tokenImage metadata error:', err);
    return errorResponse('Failed to resolve token', 500, origin);
  }
  if (!logo) {
    return errorResponse('Unknown token or no image', 404, origin);
  }

  if (!hasBucket(env)) {
    return redirect(logo);
  }

  try {
    const cached = await env.TOKEN_IMAGES.get(id);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          'Content-Type': cached.httpMetadata?.contentType ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  } catch (err) {
    console.error('tokenImage R2 read error:', err);
  }

  try {
    const upstream = await fetch(logo, { signal: AbortSignal.timeout(10_000) });
    const contentType = upstream.headers.get('Content-Type') ?? '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      return redirect(logo);
    }
    const bytes = await readResponseBodyWithLimit(upstream, MAX_IMAGE_BYTES);
    if (!bytes) {
      return redirect(logo);
    }

    await env.TOKEN_IMAGES.put(id, bytes, { httpMetadata: { contentType } });
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('tokenImage upstream error:', err);
    return redirect(logo);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
