import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const tokenCount = new URL(request.url).searchParams.get('token_count');

  if (!tokenCount) {
    return errorResponse('token_count is required', 400);
  }

  const count = Number(tokenCount);
  if (!Number.isFinite(count) || count < 0) {
    return errorResponse('token_count must be a valid non-negative number', 400);
  }

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500);
  }

  try {
    const cache = caches.default;
    const cacheKey = new Request(new URL(request.url).toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const sdk = await initVmSdk(env);
    const data = await sdk.getEstimateFees(count);

    const response = jsonResponse(data);
    response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('estimateFees error:', error);
    return errorResponse('Failed to estimate fees');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
