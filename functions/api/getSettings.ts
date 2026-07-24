import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  netCacheKey,
  networkUnavailableResponse,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_KEY = '__internal:settings_cache';
const CACHE_TTL = 3600;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    const cacheKey = netCacheKey(CACHE_KEY, network);
    const cached = await env.VM_WEB_PROFILES.get(cacheKey, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached, 200, origin);
    }

    const settings = await vmFetch(env, network, 'get_settings');

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
