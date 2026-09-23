import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenCatalog } from '../TokenCatalog';

const publicTokensMock = vi.fn();
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
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders approved tokens and filters by ticker', () => {
    publicTokensMock.mockReturnValue({ data: {
      projects: [TOKEN],
      degraded: false,
      scope: 'public',
      marketPrices: {
        [TOKEN.tokenId]: { priceUsd: 1.25, priceAda: 0.5, priceChange24h: 4.2, source: 'provider-a, provider-b', sourceCount: 2, observedAt: 100 },
      },
    }, isLoading: false, error: null });
    render(<TokenCatalog />);

    expect(screen.getByRole('heading', { name: 'Tosi Rewards' })).toBeInTheDocument();
    expect(screen.getByText(/100 TOSI \/ epoch/)).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByText('+4.20%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Visit token website/ })).toHaveAttribute('href', TOKEN.website);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search tokens' }), { target: { value: 'missing' } });
    expect(screen.getByText('No matching tokens')).toBeInTheDocument();
  });

  it('distinguishes degraded storage from an empty catalog', () => {
    publicTokensMock.mockReturnValue({ data: { projects: [], degraded: true, scope: 'public' }, isLoading: false, error: null });
    render(<TokenCatalog />);
    expect(screen.getByText('Token catalog unavailable')).toBeInTheDocument();
    expect(screen.queryByText('No tokens listed yet')).not.toBeInTheDocument();
  });
});
