import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useWalletStore } from '@/store/wallet-state';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { bech32 } from 'bech32';
import { TokenCatalog } from '../TokenCatalog';

const publicTokensMock = vi.fn();
const watchedRewardsMock = vi.fn();
const walletState = useWalletStore.getState();
vi.mock('@/features/watchlist/api/watchedRewards.queries', () => ({ useWatchedRewards: () => watchedRewardsMock() }));
vi.mock('../../api/tokens.queries', () => ({
  usePublicTokens: () => publicTokensMock(),
}));
vi.mock('@/features/projects/api/projects.queries', () => ({
  useTokenMap: () => ({ data: { 'policy.544f5349': { ticker: 'TOSI' } } }),
}));

const TOKEN = {
  id: '1', network: 'preview', ownerAddress: 'stake1owner', name: 'Tosi Rewards',
  description: 'Rewards for qualifying delegators.', website: 'https://tosidrop.me', logoUrl: '',
  tokenId: 'policy.544f5349', poolId: '',
  distribution: { amountPerEpoch: '100', minStakeAda: '', expiryEpochs: 0 }, status: 'approved' as const,
  createdAt: '', updatedAt: '', approvedAt: '',
};

describe('TokenCatalog', () => {
  beforeEach(() => { watchedRewardsMock.mockReturnValue({ data: undefined, isPending: false, error: null, refetch: vi.fn() }); });
  afterEach(() => { cleanup(); useWalletStore.setState(walletState, true); vi.clearAllMocks(); });

  it('renders approved tokens and filters by ticker', () => {
    publicTokensMock.mockReturnValue({ data: {
      projects: [TOKEN],
      degraded: false,
      scope: 'public',
      marketPrices: {
        [TOKEN.tokenId]: { priceUsd: 1.25, priceAda: 0.5, priceChange24h: 4.2, source: 'provider-a, provider-b', sourceCount: 2, observedAt: 100 },
      },
    }, isLoading: false, error: null });
    render(<MemoryRouter><TokenCatalog /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Tosi Rewards' })).toBeInTheDocument();
    expect(screen.getByText(/100 TOSI \/ epoch/)).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByText('+4.20%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Visit token website/ })).toHaveAttribute('href', TOKEN.website);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search tokens' }), { target: { value: 'missing' } });
    expect(screen.getByText('No matching tokens')).toBeInTheDocument();
  });

  it('restores combined filters from URL and clears them', () => {
    publicTokensMock.mockReturnValue({ data: { projects: [TOKEN, { ...TOKEN, id: '2', name: 'Other token', poolId: 'pool-other' }], degraded: false }, isLoading: false, error: null });
    render(<MemoryRouter initialEntries={['/tokens?q=Tosi&project=1&sort=newest']}><TokenCatalog /></MemoryRouter>);
    expect(screen.getByRole('textbox', { name: 'Search tokens' })).toHaveValue('Tosi');
    expect(screen.queryByRole('heading', { name: 'Other token' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByRole('textbox', { name: 'Search tokens' })).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Other token' })).toBeInTheDocument();
  });

  it('explains that claimable filtering needs a connected wallet', () => {
    publicTokensMock.mockReturnValue({ data: { projects: [TOKEN], degraded: false }, isLoading: false, error: null });
    render(<MemoryRouter initialEntries={['/tokens?claimable=1']}><TokenCatalog /></MemoryRouter>);
    expect(screen.getByText('Connect your wallet to find available rewards')).toBeInTheDocument();
    expect(screen.queryByText('No matching tokens')).not.toBeInTheDocument();
  });

  it('keeps eligibility errors separate from zero results and retries the check', () => {
    const address = bech32.encode(DEPLOYMENT_NETWORK === 'mainnet' ? 'stake' : 'stake_test', bech32.toWords(Uint8Array.from([DEPLOYMENT_NETWORK === 'mainnet' ? 225 : 224, ...Array<number>(28).fill(8)])), 128);
    useWalletStore.setState({ connected: true, stakeAddress: address });
    const retry = vi.fn();
    watchedRewardsMock.mockReturnValue({ error: new Error('offline'), isPending: false, refetch: retry });
    publicTokensMock.mockReturnValue({ data: { projects: [TOKEN], degraded: false }, isLoading: false, error: null });
    render(<MemoryRouter initialEntries={['/tokens?claimable=1']}><TokenCatalog /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Available rewards could not be checked');
    expect(screen.queryByText('No matching tokens')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('distinguishes degraded storage from an empty catalog', () => {
    publicTokensMock.mockReturnValue({ data: { projects: [], degraded: true, scope: 'public' }, isLoading: false, error: null });
    render(<TokenCatalog />);
    expect(screen.getByText('Token catalog unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No tokens listed yet')).not.toBeInTheDocument();
  });
});
