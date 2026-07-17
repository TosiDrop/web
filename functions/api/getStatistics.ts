import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  networkUnavailableResponse,
  jsonResponse,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_TTL = 3600;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const data = await vmFetch(env, network, 'get_statistics');

    const response = jsonResponse(data, 200, origin);
    response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('getStatistics error:', error);
    return errorResponse('Failed to fetch statistics', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
