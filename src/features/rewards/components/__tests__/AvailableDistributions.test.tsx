import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ClaimableToken } from '@/shared/rewards';
import { useClaimStore } from '@/store/claim-state';
const preferences = vi.hoisted(() => ({ favorites: new Set<string>(), hidden: new Set<string>(), favorite: vi.fn(), dislike: vi.fn() }));
vi.mock('@/features/favorites/hooks/usePreferences', () => ({ usePreferences: () => ({
  connected: true, preferencesReady: true, favoriteIds: preferences.favorites, dislikedIds: preferences.hidden,
  isFavorite: (id: string) => preferences.favorites.has(id), isDisliked: (id: string) => preferences.hidden.has(id),
  toggleFavorite: preferences.favorite, toggleDislike: preferences.dislike, isDirty: false,
}) }));
import { AvailableDistributions } from '../AvailableDistributions';
const ID = `${'a'.repeat(56)}.41727431`;
const NFT: ClaimableToken = { assetId: ID, ticker: 'ART', logo: '', decimals: 0, amount: 1, native: false, premium: false, assetType: 'nft', nft: { name: 'Art 1', image: 'https://example.com/art.png', collection: 'Gallery', identitySource: 'provider' } };
const FT: ClaimableToken = { assetId: 'ft', ticker: 'FT', logo: '', decimals: 2, amount: 12.5, native: false, premium: false };
function Harness({ tokens = [NFT, FT], maxAssets = 25 }: { tokens?: ClaimableToken[]; maxAssets?: number }) {
  const selectedAssetIds = useClaimStore((s) => s.selectedAssetIds);
  return <MemoryRouter><AvailableDistributions tokens={tokens} maxAssets={maxAssets} selectedAssetIds={selectedAssetIds} marketPrices={{ [ID]: { priceUsd: 100, priceAda: 50, priceChange24h: null, source: 'index', sourceCount: 1, observedAt: 1 } }} /></MemoryRouter>;
}
describe('AvailableDistributions NFT gallery', () => {
  beforeEach(() => { useClaimStore.getState().reset(); preferences.hidden = new Set(); preferences.favorites = new Set(); vi.clearAllMocks(); });
  afterEach(cleanup);
  it('renders NFT art and identity alongside fungible rewards, keeping NFT quantities outside market estimates', () => {
    render(<Harness tokens={[NFT, FT, { ...FT, assetId: 'lovelace', ticker: 'ADA', amount: 2, native: true }]} />);
    expect(screen.getByRole('heading', { name: 'Claimable assets' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Token rewards 2' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'NFT rewards 1' })).toBeInTheDocument();
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getByText(ID)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Art 1' })).toHaveAttribute('src', 'https://example.com/art.png');
    expect(screen.getByRole('link', { name: 'NFT details for Art 1' })).toHaveAttribute('href', `/tokens/${encodeURIComponent(ID)}`);
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getAllByText('ADA').length).toBeGreaterThan(0);
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument();
  });
  it('selects and deselects using the keyboard through the existing store', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const select = screen.getByRole('button', { name: 'Select Art 1' });
    select.focus();
    await user.keyboard(' ');
    expect(useClaimStore.getState().selectedAssetIds).toEqual([ID]);
    expect(screen.getByRole('button', { name: 'Deselect Art 1' })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Enter}');
    expect(useClaimStore.getState().selectedAssetIds).toEqual([]);
  });
  it('keeps the 25-distinct-asset ceiling while allowing deselection at the limit', async () => {
    const user = userEvent.setup();
    useClaimStore.getState().setSelected([ID, ...Array.from({ length: 24 }, (_, i) => `ft${i}`)]);
    render(<Harness tokens={[NFT, { ...NFT, assetId: `${ID}32`, nft: { ...NFT.nft!, name: 'Art 2' } }]} />);
    expect(screen.getByRole('button', { name: 'Select Art 2' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Deselect Art 1' }));
    await user.click(screen.getByRole('button', { name: 'Select Art 2' }));
    expect(useClaimStore.getState().selectedAssetIds).toHaveLength(25);
    expect(useClaimStore.getState().selectedAssetIds).toContain(`${ID}32`);
  });
  it('preserves favorite/hidden actions and deselects a newly hidden NFT', async () => {
    const user = userEvent.setup();
    useClaimStore.getState().setSelected([ID]);
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Favorite Art 1' }));
    expect(preferences.favorite).toHaveBeenCalledWith({ assetId: ID, ticker: 'ART', logo: '' });
    await user.click(screen.getByRole('button', { name: 'Hide Art 1' }));
    expect(useClaimStore.getState().selectedAssetIds).toEqual([]);
    expect(preferences.dislike).toHaveBeenCalledWith({ assetId: ID, ticker: 'ART', logo: '' });
  });
  it('keeps hidden NFTs behind the existing reveal control', async () => {
    const user = userEvent.setup();
    preferences.hidden = new Set([ID]);
    render(<Harness />);
    expect(screen.queryByText('Art 1')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hidden assets (1)' }));
    expect(screen.getByRole('button', { name: 'Select Art 1' })).toBeInTheDocument();
  });
  it('keeps selection and details available when artwork fails and offers a retry', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    fireEvent.error(screen.getByRole('img', { name: 'Art 1' }));
    expect(screen.getByText('Artwork unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Select Art 1' }));
    expect(useClaimStore.getState().selectedAssetIds).toEqual([ID]);
    await user.click(screen.getByRole('button', { name: 'Retry artwork for Art 1' }));
    expect(screen.getByRole('img', { name: 'Art 1' })).toBeInTheDocument();
  });
  it('copies the full identity without toggling NFT selection', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Copy asset ID for Art 1' }));
    expect(writeText).toHaveBeenCalledWith(ID);
    expect(useClaimStore.getState().selectedAssetIds).toEqual([]);
  });
  it('uses a readable fallback name and artwork when optional metadata is absent', () => {
    render(<Harness tokens={[{ ...NFT, nft: undefined }]} />);
    expect(screen.getByRole('button', { name: 'Select ART' })).toBeInTheDocument();
    expect(screen.getByText('Artwork unavailable')).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(within(card).getByText(ID)).toBeInTheDocument();
  });
});
