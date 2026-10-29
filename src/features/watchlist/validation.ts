import { bech32 } from 'bech32';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import type { Network } from '@/shared/network';
import { stakeAddressError } from '@/utils/ada-handle';

/** Keep the incumbent checksum/HRP messages and also verify CIP-19 reward header bits. */
export function watchedAddressError(address: string, network: Network = DEPLOYMENT_NETWORK): string | null {
  const issue = stakeAddressError(address, network);
  if (issue) return issue;
  const bytes = bech32.fromWords(bech32.decode(address, 128).words);
  const type = bytes[0] >> 4;
  if ((type !== 14 && type !== 15) || (bytes[0] & 15) !== (network === 'mainnet' ? 1 : 0)) return 'Enter a valid stake address for this network.';
  return null;
}
