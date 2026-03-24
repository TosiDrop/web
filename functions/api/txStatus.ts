import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 30;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const staking_address = url.searchParams.get('staking_address');
  const request_id = url.searchParams.get('request_id');
  const session_id = url.searchParams.get('session_id');

  if (!staking_address || !request_id || !session_id) {
    return errorResponse('staking_address, request_id, and session_id are required', 400);
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
    const data = await sdk.checkStatusCustomRequest({
      staking_address,
      request_id: Number(request_id),
      session_id,
    });

    const response = jsonResponse(data);
    response.headers.set('Cache-Control', `s-maxage=${CACHE_TTL}`);
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (error) {
    console.error('txStatus error:', error);
    return errorResponse('Failed to check transaction status');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
