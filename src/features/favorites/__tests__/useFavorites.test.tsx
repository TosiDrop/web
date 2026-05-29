import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const getMock = vi.fn();
const postMock = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: { get: (...a: unknown[]) => getMock(...a), post: (...a: unknown[]) => postMock(...a) },
}));

const signMock = vi.fn();
vi.mock('@/features/favorites/utils/signFavoritesUpdate', () => ({
  signFavoritesUpdateMessage: (...a: unknown[]) => signMock(...a),
}));

const walletState = { stakeAddress: 'stake1' + 'u'.repeat(40), connected: true };
vi.mock('@/store/wallet-state', () => ({
  useWalletStore: (sel: (s: typeof walletState) => unknown) => sel(walletState),
}));

vi.mock('@meshsdk/react', () => ({
  useWallet: () => ({ wallet: { signData: vi.fn() }, connected: true }),
}));

import { useFavorites } from '../hooks/useFavorites';
import { useFavoritesDraft } from '../store/favorites-draft';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useFavorites', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    signMock.mockReset();
    useFavoritesDraft.setState({ draft: null, owner: null });
  });

  it('hydrates saved favorites and reports not dirty', async () => {
    getMock.mockResolvedValue({ favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }] });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.favorites).toHaveLength(1));
    expect(result.current.isFavorite('a1')).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('toggle adds to the draft and marks dirty', async () => {
    getMock.mockResolvedValue({ favorites: [] });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggle({ assetId: 'a2', ticker: 'B', logo: '' }));
    expect(result.current.isFavorite('a2')).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('persist signs once, posts the draft, and clears dirty on success', async () => {
    getMock.mockResolvedValue({ favorites: [] });
    signMock.mockResolvedValue({ signature: 's', key: 'k', message: 'm' });
    postMock.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggle({ assetId: 'a2', ticker: 'B', logo: '' }));
    await act(async () => {
      await result.current.persist();
    });
    expect(signMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/api/userFavorites', expect.objectContaining({
      stakeAddress: walletState.stakeAddress,
      favorites: [{ assetId: 'a2', ticker: 'B', logo: '' }],
      signature: 's', key: 'k', message: 'm',
    }));
    expect(result.current.isDirty).toBe(false);
  });

  it('surfaces a signing error without clearing the draft', async () => {
    getMock.mockResolvedValue({ favorites: [] });
    signMock.mockRejectedValue(new Error('user declined'));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggle({ assetId: 'a2', ticker: 'B', logo: '' }));
    await act(async () => {
      await result.current.persist();
    });
    expect(result.current.error).toBe('user declined');
    expect(result.current.isDirty).toBe(true);
  });
});
