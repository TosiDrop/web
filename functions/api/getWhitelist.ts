import type { Env } from '../types/env';
import {
  initVmSdk,
  requireApiKey,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_KEY = '__internal:whitelist_cache';
const CACHE_TTL = 86400; // 24h

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    const cached = await env.VM_WEB_PROFILES.get(CACHE_KEY, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached, 200, origin);
    }

    const sdk = await initVmSdk(env);
    const whitelist = await sdk.getWhitelist();

    context.waitUntil(
      env.VM_WEB_PROFILES.put(CACHE_KEY, JSON.stringify(whitelist), {
        expirationTtl: CACHE_TTL,
      }),
    );

    return jsonResponse(whitelist, 200, origin);
  } catch (error) {
    console.error('getWhitelist error:', error);
    return errorResponse('Failed to fetch whitelist', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
