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

const CACHE_KEY = '__internal:settings_cache';
const CACHE_TTL = 3600;

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

    const settings = await vmGet(env, 'get_settings');

    context.waitUntil(env.VM_WEB_PROFILES.put(cacheKey, JSON.stringify(settings), {
      expirationTtl: CACHE_TTL,
    }));

    return jsonResponse(settings, 200, origin);
  } catch (error) {
    console.error('getSettings error:', error);
    return errorResponse('Failed to fetch settings', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
