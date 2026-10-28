import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEPLOYMENT_NETWORK } from '@/config/network';

const policy = 'ab'.repeat(28);
const assetName = '544f5349';
const unit = `${policy}${assetName}`;
const assetId = `${policy}.${assetName}`;
const toggleFavorite = vi.fn();
vi.mock('@/store/wallet-state', () => ({ useWalletStore: (select: (value: { stakeAddress: string }) => unknown) => select({ stakeAddress: 'stake_test1example' }) }));
vi.mock('@/features/tokens/api/tokens.queries', () => ({ usePublicTokens: () => ({ data: { projects: [{ tokenId: `${'ab'.repeat(28)}.544f5349`, name: 'Tosi program', description: 'Program description' }] } }) }));
vi.mock('@/features/projects/api/projects.queries', () => ({ useTokenMap: () => ({ data: { [`${'ab'.repeat(28)}.544f5349`]: { ticker: 'TOSI' } } }) }));
vi.mock('@/features/market/api/market.queries', () => ({ useMarketPrices: () => ({ data: {} }) }));
vi.mock('@/features/favorites/hooks/usePreferences', () => ({ usePreferences: () => ({ connected: true, preferencesReady: true, isFavorite: () => false, toggleFavorite }) }));
vi.mock('@/features/favorites/components/FavoritesSaveBar', () => ({ FavoritesSaveBar: () => null }));

import TokenDetailPage from '../TokenDetailPage';

describe('wallet token detail links', () => {
  afterEach(() => { cleanup(); toggleFavorite.mockClear(); });

  it.each([unit, assetId])('resolves %s to the catalog ID used by claims and favorites', (routeId) => {
    const client = new QueryClient();
    client.setQueryData(['wallet-summary', DEPLOYMENT_NETWORK, 'stake_test1example'], { summary: { holdings: [{ unit, name: 'Wallet name', ticker: 'TOSI' }] } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/tokens/${routeId}`]}><Routes><Route path="/tokens/:assetId" element={<TokenDetailPage />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: 'Tosi program' })).toBeInTheDocument();
    expect(screen.getByText('Program description')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Favorite TOSI' }));
    expect(toggleFavorite).toHaveBeenCalledWith({ assetId, ticker: 'TOSI', logo: '' });
  });
});
