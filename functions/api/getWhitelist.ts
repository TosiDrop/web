import type { Env } from '../types/env';
import {
  vmConfig,
  vmGet,
  deploymentCacheKey,
  vmConfigurationErrorResponse,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_KEY = '__internal:whitelist_cache';
const CACHE_TTL = 86400; // 24h

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!vmConfig(env)) return vmConfigurationErrorResponse(origin);

  try {
    const cacheKey = deploymentCacheKey(env, CACHE_KEY);
    const cached = await env.VM_WEB_PROFILES.get(cacheKey, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached, 200, origin);
    }

    const whitelist = await vmGet(env, 'get_whitelist');

    context.waitUntil(
      env.VM_WEB_PROFILES.put(cacheKey, JSON.stringify(whitelist), {
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
