import type { Env } from '../types/env';
import { initVmSdk, jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_KEY = '__internal:pools_cache';
const CACHE_TTL = 86400;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  if (!env.VITE_VM_API_KEY || env.VITE_VM_API_KEY.trim() === '') {
    return errorResponse('Server configuration error', 500);
  }

  try {
    const cached = await env.VM_WEB_PROFILES.get(CACHE_KEY, { type: 'json' });
    if (cached !== null) {
      return jsonResponse(cached);
    }

    const sdk = await initVmSdk(env);
    const data = await sdk.getPools();

    await env.VM_WEB_PROFILES.put(CACHE_KEY, JSON.stringify(data), {
      expirationTtl: CACHE_TTL,
    });

    return jsonResponse(data);
  } catch (error) {
    console.error('getPools error:', error);
    return errorResponse('Failed to fetch pools');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
