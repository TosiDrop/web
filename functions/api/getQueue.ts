import type { Env } from '../types/env';
import { initVmSdk, requireApiKey, withCache, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 60;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const keyError = requireApiKey(env);
  if (keyError) return keyError;

  try {
    return await withCache(request, CACHE_TTL, async () => {
      const sdk = await initVmSdk(env);
      return sdk.getPendingTxCount();
    });
  } catch (error) {
    console.error('getQueue error:', error);
    return errorResponse('Failed to fetch pending transaction count');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
