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
export const ADA_HANDLE_POLICY_ID = 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a';
const HANDLE_LABELS = new Set(['000de140', '0013ab30']);

export function adaHandlesFromAssets(assets: Array<{ policyId?: string; assetName?: string }>): string[] {
  const handles = new Set<string>();
  for (const asset of assets) {
    if (asset.policyId?.toLowerCase() !== ADA_HANDLE_POLICY_ID || !asset.assetName) continue;
    const encoded = asset.assetName.toLowerCase();
    const nameHex = HANDLE_LABELS.has(encoded.slice(0, 8)) ? encoded.slice(8) : encoded;
    if (!/^(?:[0-9a-f]{2})+$/.test(nameHex)) continue;
    try {
      const name = new TextDecoder().decode(new Uint8Array(nameHex.match(/../g)!.map((byte) => parseInt(byte, 16))));
      if (/^[a-z0-9_.-]{1,15}$/i.test(name)) handles.add(`$${name}`);
    } catch {
      // Ignore malformed wallet assets.
    }
  }
  return [...handles].sort();
}

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
