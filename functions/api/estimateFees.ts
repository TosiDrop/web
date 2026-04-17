import type { Env } from '../types/env';
import { initVmSdk, requireApiKey, withCache, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const tokenCount = new URL(request.url).searchParams.get('token_count');

  if (!tokenCount) {
    return errorResponse('token_count is required', 400);
  }

  const count = Number(tokenCount);
  if (!Number.isInteger(count) || count < 1) {
    return errorResponse('token_count must be a positive integer', 400);
  }

  const keyError = requireApiKey(env);
  if (keyError) return keyError;

  try {
    return await withCache(request, CACHE_TTL, async () => {
      const sdk = await initVmSdk(env);
      return sdk.getEstimateFees(count);
    });
  } catch (error) {
    console.error('estimateFees error:', error);
    return errorResponse('Failed to estimate fees');
  }
};

export const onRequestOptions: PagesFunction = async () => optionsResponse();
