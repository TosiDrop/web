import type { Network } from '@/shared/network';
import { watchedAddressError } from './validation';

export interface WatchedWallet { address: string; name: string }
export const MAX_WATCHED_WALLETS = 10;
export const watchlistStorageKey = (network: Network) => `tosidrop-watched-wallets:v1:${network}`;

export function loadWatchedWallets(storage: Pick<Storage, 'getItem'>, network: Network): WatchedWallet[] {
  try {
    const raw = storage.getItem(watchlistStorageKey(network));
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_WATCHED_WALLETS) throw new Error();
    const seen = new Set<string>();
    return parsed.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error();
      const { address, name } = entry as Partial<WatchedWallet>;
      if (typeof address !== 'string' || watchedAddressError(address, network) || typeof name !== 'string' || !name.trim() || name.length > 40 || seen.has(address)) throw new Error();
      seen.add(address);
      return { address, name: name.trim() };
    });
  } catch { throw new Error('Your saved wallet list could not be read. Retry loading it or reset this network’s list.'); }
}
export function saveWatchedWallets(storage: Pick<Storage, 'setItem'>, network: Network, wallets: WatchedWallet[]): void {
  storage.setItem(watchlistStorageKey(network), JSON.stringify(wallets));
}
export function addWatchedWallet(wallets: WatchedWallet[], address: string, name: string, network: Network): WatchedWallet[] {
  const issue = watchedAddressError(address, network);
  if (issue) throw new Error(issue);
  if (wallets.some((wallet) => wallet.address === address)) throw new Error('You are already watching this wallet. Rename it below.');
  if (wallets.length >= MAX_WATCHED_WALLETS) throw new Error(`You can watch up to ${MAX_WATCHED_WALLETS} wallets. Remove one to add another.`);
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 40) throw new Error('Give this wallet a name with 1–40 characters.');
  return [...wallets, { address, name: cleanName }];
}

export function renameWatchedWallet(wallets: WatchedWallet[], address: string, name: string): WatchedWallet[] {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 40) throw new Error('Give this wallet a name with 1–40 characters.');
  return wallets.map((wallet) => wallet.address === address ? { ...wallet, name: cleanName } : wallet);
}
