import type { Env } from '../types/env';
import {
  deploymentNetwork,
  withCache,
  errorResponse,
  optionsResponse,
} from '../services/vmClient';
import { stakeAddressError } from '../../src/shared/stakeAddress';

// Current delegation is ledger state, so it comes from Koios (like handle
// resolution does), not from the VM's reward history: reward rows lag or
// disappear after a claim, and a redelegated wallet keeps earning from the
// old pool for a while.
const KOIOS_BASES = {
  mainnet: 'https://api.koios.rest/api/v1',
  preview: 'https://preview.koios.rest/api/v1',
} as const;

const CACHE_TTL = 300;

interface KoiosAccountInfo {
  stake_address: string;
  status?: string;
  delegated_pool?: string | null;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakingAddress = new URL(request.url).searchParams.get('staking_address')?.trim() ?? '';
  const network = deploymentNetwork(env);

  // Checksum and HRP are verified here so a malformed or wrong-network value
  // is a 400, not an "empty account" from Koios that reads as "not delegated".
  const problem = stakeAddressError(stakingAddress, network);
  if (problem) return errorResponse(problem, 400, origin);

  const koiosBase = KOIOS_BASES[network];

  try {
    return await withCache(request, env, CACHE_TTL, async () => {
      const res = await fetch(`${koiosBase}/account_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _stake_addresses: [stakingAddress] }),
      });
      if (!res.ok) throw new Error(`Koios account_info failed (${res.status})`);
      const [account] = (await res.json()) as KoiosAccountInfo[];
      const poolId = account?.delegated_pool ?? null;
      return {
        poolId: typeof poolId === 'string' && poolId.startsWith('pool') ? poolId : null,
        registered: account?.status === 'registered',
      };
    }, context.waitUntil.bind(context));
  } catch (error) {
    console.error('delegation error:', error);
    return errorResponse('Failed to look up delegation', 502, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
