import { bech32 } from 'bech32';
import { describe, expect, it } from 'vitest';
import { addWatchedWallet, loadWatchedWallets, saveWatchedWallets, watchlistStorageKey } from '../storage';
const address = (n: number, mainnet = false) => bech32.encode(mainnet ? 'stake' : 'stake_test', bech32.toWords(Uint8Array.from([mainnet ? 225 : 224, ...Array<number>(28).fill(n)])), 128);
const store = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } }; };

describe('watched wallet persistence', () => {
  it('isolates networks, validates saved addresses and reloads names', () => {
    const storage = store();
    const wallets = addWatchedWallet([], address(1), 'My rewards', 'preview');
    saveWatchedWallets(storage, 'preview', wallets);
    expect(loadWatchedWallets(storage, 'preview')).toEqual(wallets);
    expect(loadWatchedWallets(storage, 'mainnet')).toEqual([]);
    storage.setItem(watchlistStorageKey('preview'), JSON.stringify([{ address: address(1, true), name: 'Wrong network' }]));
    expect(() => loadWatchedWallets(storage, 'preview')).toThrow(/saved wallet list/i);
  });
  it('rejects duplicates, invalid addresses and the eleventh wallet', () => {
    const wallets = Array.from({ length: 10 }, (_, i) => ({ address: address(i + 1), name: `Wallet ${i}` }));
    expect(() => addWatchedWallet(wallets, address(1), 'Duplicate', 'preview')).toThrow(/already/);
    expect(() => addWatchedWallet(wallets, address(11), 'Extra', 'preview')).toThrow(/10/);
    expect(() => addWatchedWallet([], address(1, true), 'Other', 'preview')).toThrow(/Mainnet/);
  });
  it('rejects checksummed addresses with a mismatched network byte or non-reward header', () => {
    const encoded = (header: number) => bech32.encode('stake_test', bech32.toWords(Uint8Array.from([header, ...Array<number>(28).fill(3)])), 128);
    expect(() => addWatchedWallet([], encoded(225), 'Wrong network bits', 'preview')).toThrow(/valid stake address/);
    expect(() => addWatchedWallet([], encoded(96), 'Wrong address type', 'preview')).toThrow(/valid stake address/);
  });
  it('surfaces corrupt and blocked storage instead of pretending to save', () => {
    const storage = store();
    storage.setItem(watchlistStorageKey('preview'), '{');
    expect(() => loadWatchedWallets(storage, 'preview')).toThrow(/saved wallet list/i);
    expect(() => saveWatchedWallets({ setItem: () => { throw new Error('blocked'); } }, 'preview', [])).toThrow('blocked');
  });
});
