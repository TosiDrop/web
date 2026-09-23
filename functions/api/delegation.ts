import type { Env } from '../types/env';
import {
  deploymentNetwork,
  withCache,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';
import { KoiosClient } from '../services/koiosClient';
import { stakeAddressError } from '../../src/shared/stakeAddress';

const CACHE_TTL = 300;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakingAddress = new URL(request.url).searchParams.get('staking_address')?.trim() ?? '';
  const network = deploymentNetwork(env);

  // Checksum and HRP are verified here so a malformed or wrong-network value
  // is a 400, not an "empty account" from Koios that reads as "not delegated".
  const problem = stakeAddressError(stakingAddress, network);
  if (problem) return errorResponse(problem, 400, origin);

  const koios = new KoiosClient(env);

  try {
    return await withCache(request, env, CACHE_TTL, async () => {
      const [account] = await koios.accountInfo(stakingAddress);
      const poolId = account?.delegated_pool ?? null;
      return {
        poolId: typeof poolId === 'string' && poolId.startsWith('pool') ? poolId : null,
        registered: account?.status === 'registered',
      };
    }, context.waitUntil.bind(context), koios.config.baseUrl);
  } catch (error) {
    console.error('delegation error:', error);
    return errorResponse('Failed to look up delegation', 502, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
