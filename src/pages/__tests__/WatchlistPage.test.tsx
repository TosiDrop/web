import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { bech32 } from 'bech32';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WatchlistPage from '../WatchlistPage';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimStore } from '@/store/claim-state';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { watchlistStorageKey } from '@/features/watchlist/storage';

const { getMock, resolveMock } = vi.hoisted(() => ({ getMock: vi.fn(), resolveMock: vi.fn() }));
vi.mock('@/api/client', () => ({ apiClient: { get: getMock } }));
vi.mock('@/utils/ada-handle', async (original) => ({ ...await original<typeof import('@/utils/ada-handle')>(), resolveAdaHandle: resolveMock }));
const address = bech32.encode(DEPLOYMENT_NETWORK === 'mainnet' ? 'stake' : 'stake_test', bech32.toWords(Uint8Array.from([DEPLOYMENT_NETWORK === 'mainnet' ? 225 : 224, ...Array<number>(28).fill(7)])), 128);
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><WatchlistPage /></MemoryRouter></QueryClientProvider>);
const addWallet = (input = address) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Wallet name' }), { target: { value: 'Rewards wallet' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Stake address or $handle' }), { target: { value: input } });
  fireEvent.click(screen.getByRole('button', { name: 'Watch wallet' }));
};

describe('WatchlistPage', () => {
  beforeEach(() => { localStorage.clear(); getMock.mockResolvedValue({ rewards: [] }); resolveMock.mockResolvedValue(address); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it('saves resolved handles and loads rewards without changing signing or claim state', async () => {
    const walletBefore = useWalletStore.getState();
    const claimBefore = useClaimStore.getState();
    getMock.mockResolvedValue({ rewards: [{ assetId: 'policy.asset', ticker: 'TOSI', amount: 25, decimals: 0, native: false, premium: false, logo: '' }] });
    mount();
    expect(screen.getByText('Keep an eye on your rewards')).toBeInTheDocument();
    addWallet('$rewards');
    expect(await screen.findByRole('heading', { name: 'Rewards wallet' })).toBeInTheDocument();
    expect(await screen.findByText('25')).toBeInTheDocument();
    expect(resolveMock).toHaveBeenCalledWith('$rewards');
    expect(useWalletStore.getState()).toBe(walletBefore);
    expect(useClaimStore.getState()).toBe(claimBefore);
    expect(JSON.parse(localStorage.getItem(watchlistStorageKey(DEPLOYMENT_NETWORK))!)).toEqual([{ address, name: 'Rewards wallet' }]);
    expect(screen.getByText(/Connect this wallet to claim/)).toBeInTheDocument();
  });
  it('supports rename, duplicate recovery and removal across reloads', async () => {
    const view = mount(); addWallet();
    await screen.findByRole('heading', { name: 'Rewards wallet' });
    addWallet(); expect(await screen.findByRole('alert')).toHaveTextContent('already watching');
    fireEvent.click(screen.getByRole('button', { name: 'Rename Rewards wallet' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New wallet name' }), { target: { value: 'Savings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    expect(screen.getByRole('heading', { name: 'Savings' })).toBeInTheDocument();
    view.unmount(); mount();
    expect(screen.getByRole('heading', { name: 'Savings' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Savings' }));
    expect(screen.getByText('Keep an eye on your rewards')).toBeInTheDocument();
  });
  it('shows storage write failures and leaves the list unchanged', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('full'); });
    mount(); addWallet();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.queryByRole('heading', { name: 'Rewards wallet' })).not.toBeInTheDocument();
  });
  it('recovers corrupt storage with an explicit reset', () => {
    localStorage.setItem(watchlistStorageKey(DEPLOYMENT_NETWORK), '{');
    mount(); expect(screen.getByRole('alert')).toHaveTextContent('could not be read');
    fireEvent.click(screen.getByRole('button', { name: 'Reset saved list' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Watch wallet' })).toBeEnabled();
  });
  it('keeps a per-wallet fetch failure visible and allows retry', async () => {
    getMock.mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline'));
    mount(); addWallet();
    await waitFor(() => expect(screen.getByText('Rewards could not be loaded')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: 'Retry rewards for Rewards wallet' }));
    expect(await screen.findByText('No rewards available right now')).toBeInTheDocument();
  });
});
