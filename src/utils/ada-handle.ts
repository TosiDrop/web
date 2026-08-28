import { bech32 } from 'bech32';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { networkLabel, type Network } from '@/shared/network';

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

const STAKE_HRP: Record<Network, string> = { mainnet: 'stake', preview: 'stake_test' };
const STAKE_KEY_BYTES = 29; // 1 header byte + 28-byte credential (CIP-19)

/**
 * Why the input is not a stake address for this deployment, or null when it
 * is one. Decodes the bech32 checksum and requires the HRP of the deployment
 * network, so a typo or the other network's address is caught here rather
 * than turned into a "nothing to claim" result by the API.
 */
export function stakeAddressError(input: string, network: Network = DEPLOYMENT_NETWORK): string | null {
  let decoded: { prefix: string; words: number[] };
  try {
    decoded = bech32.decode(input, 128);
  } catch {
    return 'Enter a $handle or a valid stake address.';
  }
  const other = network === 'mainnet' ? 'preview' : 'mainnet';
  if (decoded.prefix === STAKE_HRP[other]) {
    return `That is a ${networkLabel(other)} stake address; this site is on ${networkLabel(network)}.`;
  }
  if (decoded.prefix !== STAKE_HRP[network] || bech32.fromWords(decoded.words).length !== STAKE_KEY_BYTES) {
    return 'Enter a $handle or a valid stake address.';
  }
  return null;
}

export function isStakeAddress(input: string, network: Network = DEPLOYMENT_NETWORK): boolean {
  return stakeAddressError(input, network) === null;
}
