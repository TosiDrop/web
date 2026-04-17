import type { Env } from '../types/env';
import { initVmSdk, requireApiKey, withCache, errorResponse, optionsResponse } from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);
  const staking_address = url.searchParams.get('staking_address');
  const token_id = url.searchParams.get('token_id');

  if (!staking_address) {
    return errorResponse('staking_address is required', 400, origin);
  }

  const keyError = requireApiKey(env, origin);
  if (keyError) return keyError;

  try {
    return await withCache(request, CACHE_TTL, async () => {
      const sdk = await initVmSdk(env);
      const input: { staking_address: string; token_id?: string } = { staking_address };
      if (token_id) input.token_id = token_id;
      return sdk.getDeliveredRewards(input);
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('getDeliveredRewards error:', error);
    return errorResponse('Failed to fetch delivered rewards', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
