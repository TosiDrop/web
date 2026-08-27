import { apiClient } from '@/api/client';

/**
 * Returns true if the input looks like an ADA handle ($name).
 */
export function isAdaHandle(input: string): boolean {
  return input.startsWith('$') && input.length > 1;
}

/**
 * Resolve an ADA handle (e.g. "$wolf31o2") to a stake address.
 * Calls our backend which proxies to the deployment's Koios network (avoids CORS).
 */
export async function resolveAdaHandle(handle: string): Promise<string> {
  const data = await apiClient.get<{ stakeAddress: string }>(
    `/api/resolveHandle?handle=${encodeURIComponent(handle)}`,
  );
  return data.stakeAddress;
}

const STAKE_ADDRESS_RE = /^(stake1|stake_test1)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/;

/**
 * Returns true if the input is a lowercase bech32 stake address (mainnet or testnet).
 */
export function isStakeAddress(input: string): boolean {
  return input.length >= 59 && input.length <= 64 && STAKE_ADDRESS_RE.test(input);
}
