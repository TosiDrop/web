import type { Env } from '../types/env';
import {
  resolveNetwork,
  vmConfigFor,
  vmFetch,
  networkUnavailableResponse,
  withCache,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const network = resolveNetwork(request);
  const staking_address = new URL(request.url).searchParams.get('staking_address');

  if (!staking_address) {
    return errorResponse('staking_address is required', 400, origin);
  }

  if (!vmConfigFor(env, network)) return networkUnavailableResponse(origin);

  try {
    return await withCache(request, CACHE_TTL, async () => {
      return vmFetch(env, network, 'get_reward_breakdown', { staking_address });
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('getRewardBreakdown error:', error);
    return errorResponse('Failed to fetch reward breakdown', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
