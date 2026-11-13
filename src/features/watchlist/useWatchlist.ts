import { useCallback, useEffect, useState } from 'react';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { loadWatchedWallets, saveWatchedWallets, watchlistStorageKey, type WatchedWallet } from './storage';

function readSaved() {
  try { return { wallets: loadWatchedWallets(window.localStorage, DEPLOYMENT_NETWORK), error: null as string | null }; }
  catch (error) { return { wallets: [] as WatchedWallet[], error: error instanceof Error ? error.message : 'Your saved wallet list could not be read. Retry loading it.' }; }
}
export function useWatchlist() {
  const [state, setState] = useState(readSaved);
  const reload = useCallback(() => setState(readSaved()), []);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === watchlistStorageKey(DEPLOYMENT_NETWORK)) reload(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);
  const update = (change: (wallets: WatchedWallet[]) => WatchedWallet[]) => {
    // Read again so another tab's saved changes survive an in-flight handle lookup.
    const current = loadWatchedWallets(window.localStorage, DEPLOYMENT_NETWORK);
    const next = change(current);
    try { saveWatchedWallets(window.localStorage, DEPLOYMENT_NETWORK, next); }
    catch { throw new Error('Your changes could not be saved on this device. Check browser storage and try again.'); }
    setState({ wallets: next, error: null });
  };
  const reset = () => {
    try { saveWatchedWallets(window.localStorage, DEPLOYMENT_NETWORK, []); setState({ wallets: [], error: null }); }
    catch { setState((current) => ({ ...current, error: 'The saved list could not be reset. Check browser storage and try again.' })); }
  };
  return { ...state, update, reload, reset };
}
