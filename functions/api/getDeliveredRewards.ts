import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const staking_address = url.searchParams.get('staking_address');
  const token_id = url.searchParams.get('token_id');

  if (!staking_address) {
    return errorResponse('staking_address is required', 400);
  }

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500);
  }

  try {
    const cache = caches.default;
    const cacheKey = new Request(url.toString());
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const sdk = await initVmSdk(env);
    const input: { staking_address: string; token_id?: string } = { staking_address };
    if (token_id) input.token_id = token_id;

    const data = await sdk.getDeliveredRewards(input);

    const response = jsonResponse(data);
    response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('getDeliveredRewards error:', error);
    return errorResponse('Failed to fetch delivered rewards');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
