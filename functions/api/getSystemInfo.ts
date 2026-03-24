import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500);
  }

  try {
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const sdk = await initVmSdk(env);
    const data = await sdk.getSystemInfo();

    const response = jsonResponse(data);
    response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('getSystemInfo error:', error);
    return errorResponse('Failed to fetch system info');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
