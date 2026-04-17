import type { Env } from '../types/env';
import { initVmSdk, requireApiKey, withCache, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const tokenCount = new URL(request.url).searchParams.get('token_count');

  if (!tokenCount) {
    return errorResponse('token_count is required', 400, origin);
  }

  const count = Number(tokenCount);
  if (!Number.isInteger(count) || count < 1) {
    return errorResponse('token_count must be a positive integer', 400, origin);
  }

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    return await withCache(request, CACHE_TTL, async () => {
      const sdk = await initVmSdk(env);
      return sdk.getEstimateFees(count);
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('estimateFees error:', error);
    return errorResponse('Failed to estimate fees', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
