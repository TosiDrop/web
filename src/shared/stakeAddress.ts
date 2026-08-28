import { bech32 } from 'bech32';
import { networkLabel, type Network } from './network';

// Shared by the client and the Pages Functions: what counts as a stake
// address for a given deployment. Checksum and HRP are verified, so a typo
// or the other network's address is rejected before it reaches Koios or the
// VM and comes back looking like an empty account.

const STAKE_HRP: Record<Network, string> = { mainnet: 'stake', preview: 'stake_test' };
const STAKE_KEY_BYTES = 29; // 1 header byte + 28-byte credential (CIP-19)

/** Why `input` is not a stake address on `network`, or null when it is one. */
export function stakeAddressError(input: string, network: Network): string | null {
  let decoded: { prefix: string; words: number[] };
  try {
    decoded = bech32.decode(input, 128);
  } catch {
    return 'Enter a $handle or a valid stake address.';
  }
  const other: Network = network === 'mainnet' ? 'preview' : 'mainnet';
  if (decoded.prefix === STAKE_HRP[other]) {
    return `That is a ${networkLabel(other)} stake address; this site is on ${networkLabel(network)}.`;
  }
  if (decoded.prefix !== STAKE_HRP[network] || bech32.fromWords(decoded.words).length !== STAKE_KEY_BYTES) {
    return 'Enter a $handle or a valid stake address.';
  }
  return null;
}

export function isStakeAddress(input: string, network: Network): boolean {
  return stakeAddressError(input, network) === null;
}
