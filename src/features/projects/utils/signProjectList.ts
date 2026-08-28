import { DEPLOYMENT_NETWORK } from '@/config/network';
import { buildProjectListMessage, encodeStakeAuth } from '@/shared/projects';
import { toHex } from './signProjectUpdate';

interface MinimalWallet {
  signData(address: string, payload: string): Promise<{ signature: string; key: string }>;
}

// The server accepts a list signature for 5 minutes; reuse one for a little
// less than that so refetches (after a save, on focus) don't re-prompt the
// wallet every time.
const REUSE_MS = 4.5 * 60 * 1000;
const cache = new Map<string, { header: string; expiresAt: number }>();

/** `Authorization` header proving control of `stakeAddress` for listing its projects. */
export async function projectListAuthHeader(
  wallet: MinimalWallet,
  stakeAddress: string,
  now = Date.now(),
): Promise<string> {
  const cached = cache.get(stakeAddress);
  if (cached && cached.expiresAt > now) return cached.header;
  const message = buildProjectListMessage(DEPLOYMENT_NETWORK, stakeAddress, new Date(now));
  const { signature, key } = await wallet.signData(stakeAddress, toHex(message));
  const header = encodeStakeAuth({ signature, key, message });
  cache.set(stakeAddress, { header, expiresAt: now + REUSE_MS });
  return header;
}

export function forgetProjectListAuth(stakeAddress?: string): void {
  if (stakeAddress) cache.delete(stakeAddress);
  else cache.clear();
}
