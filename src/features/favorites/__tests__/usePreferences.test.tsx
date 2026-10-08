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
vi.mock('@/features/favorites/utils/signPreferencesUpdate', () => ({
  signPreferencesUpdateMessage: (...a: unknown[]) => signMock(...a),
}));

const walletState = {
  stakeAddress: 'stake1' + 'u'.repeat(40),
  connected: true,
  wallet: { signData: vi.fn() },
};
vi.mock('@/store/wallet-state', () => ({
  useWalletStore: (sel: (s: typeof walletState) => unknown) => sel(walletState),
}));

import { usePreferences } from '../hooks/usePreferences';
import { usePreferencesDraft } from '../store/preferences-draft';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('usePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    walletState.stakeAddress = 'stake1' + 'u'.repeat(40);
    getMock.mockReset();
    postMock.mockReset();
    signMock.mockReset();
    usePreferencesDraft.setState({ draft: null, owner: null });
  });

  it('hydrates both lists and reports not dirty', async () => {
    getMock.mockResolvedValue({
      favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
      dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }],
    });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.favorites).toHaveLength(1));
    expect(result.current.isFavorite('a1')).toBe(true);
    expect(result.current.isDisliked('z1')).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('toggleFavorite adds to the draft and marks dirty', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));
    expect(result.current.isFavorite('a2')).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('waits for saved preferences before accepting edits', async () => {
    let finishLoad!: (value: { favorites: Array<{ assetId: string; ticker: string; logo: string }>; dislikes: [] }) => void;
    getMock.mockReturnValue(new Promise((resolve) => { finishLoad = resolve; }));
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => result.current.toggleFavorite({ assetId: 'new', ticker: 'NEW', logo: '' }));
    act(() => result.current.toggleDislike({ assetId: 'hidden', ticker: 'HIDDEN', logo: '' }));
    expect(result.current.hasLocalDraft).toBe(false);
    await act(async () => { finishLoad({ favorites: [{ assetId: 'saved', ticker: 'SAVED', logo: '' }], dislikes: [] }); });
    await waitFor(() => expect(result.current.preferencesReady).toBe(true));
    act(() => result.current.toggleFavorite({ assetId: 'new', ticker: 'NEW', logo: '' }));
    expect([...result.current.favoriteIds]).toEqual(['saved', 'new']);
  });

  it('toggleDislike moves a favorited token into dislikes', async () => {
    getMock.mockResolvedValue({
      favorites: [{ assetId: 'a1', ticker: 'A', logo: '' }],
      dislikes: [],
    });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleDislike({ assetId: 'a1', ticker: 'A', logo: '' }));
    expect(result.current.isFavorite('a1')).toBe(false);
    expect(result.current.isDisliked('a1')).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('toggleFavorite moves a disliked token into favorites', async () => {
    getMock.mockResolvedValue({
      favorites: [],
      dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }],
    });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'z1', ticker: 'Z', logo: '' }));
    expect(result.current.isDisliked('z1')).toBe(false);
    expect(result.current.isFavorite('z1')).toBe(true);
  });

  it('persist signs both lists, posts the draft, and clears dirty on success', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    signMock.mockResolvedValue({ signature: 's', key: 'k', message: 'm' });
    postMock.mockResolvedValue({ success: true });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));
    act(() => result.current.toggleDislike({ assetId: 'z1', ticker: 'Z', logo: '' }));
    await act(async () => {
      await result.current.persist();
    });
    expect(signMock).toHaveBeenCalledTimes(1);
    expect(signMock).toHaveBeenCalledWith(
      expect.objectContaining({ favoriteIds: ['a2'], dislikedIds: ['z1'] }),
    );
    expect(postMock).toHaveBeenCalledWith('/api/tokenPreferences', expect.objectContaining({
      stakeAddress: walletState.stakeAddress,
      favorites: [{ assetId: 'a2', ticker: 'B', logo: '' }],
      dislikes: [{ assetId: 'z1', ticker: 'Z', logo: '' }],
      signature: 's', key: 'k', message: 'm',
    }));
    expect(result.current.isDirty).toBe(false);
  });

  it('surfaces a signing error without clearing the draft', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    signMock.mockRejectedValue(new Error('user declined'));
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));
    await act(async () => {
      await result.current.persist();
    });
    expect(result.current.error).toBe('user declined');
    expect(result.current.isDirty).toBe(true);
  });

  it('keeps an unsaved favorite for the same wallet after a reload', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    const first = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    act(() => first.result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));
    first.unmount();
    act(() => usePreferencesDraft.setState({ draft: null, owner: null }));

    const second = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(second.result.current.isFavorite('a2')).toBe(true));
    expect(second.result.current.isDirty).toBe(true);
    expect(second.result.current.hasLocalDraft).toBe(true);
  });

  it('removes the local draft after a successful save', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    signMock.mockResolvedValue({ signature: 's', key: 'k', message: 'm' });
    postMock.mockResolvedValue({ success: true });
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));
    expect(localStorage.length).toBeGreaterThan(0);
    await act(async () => { await result.current.persist(); });
    expect(localStorage.length).toBe(0);
  });

  it('preserves edits made while an earlier draft is saving', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    signMock.mockResolvedValue({ signature: 's', key: 'k', message: 'm' });
    let finishSave!: (value: { success: boolean }) => void;
    postMock.mockReturnValue(new Promise((resolve) => { finishSave = resolve; }));
    const { result } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a1', ticker: 'A', logo: '' }));
    let pending!: Promise<void>;
    await act(async () => { pending = result.current.persist(); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    act(() => result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));
    await act(async () => { finishSave({ success: true }); await pending; });

    expect(result.current.isFavorite('a2')).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.hasLocalDraft).toBe(true);
    expect(localStorage.getItem(localStorage.key(0)!)).toContain('a2');
    expect(postMock.mock.calls[0][1].favorites).toHaveLength(1);
  });

  it('leaves the active wallet draft intact when a different wallet finishes saving', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    signMock.mockResolvedValue({ signature: 's', key: 'k', message: 'm' });
    let finishSave!: (value: { success: boolean }) => void;
    postMock.mockReturnValue(new Promise((resolve) => { finishSave = resolve; }));
    const { result, rerender } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a1', ticker: 'A', logo: '' }));
    let pending!: Promise<void>;
    await act(async () => { pending = result.current.persist(); });
    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    walletState.stakeAddress = 'stake1' + 'v'.repeat(40);
    rerender();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'b1', ticker: 'B', logo: '' }));
    const activeDraft = usePreferencesDraft.getState().draft;
    const owners: Array<string | null> = [];
    const unsubscribe = usePreferencesDraft.subscribe((state) => owners.push(state.owner));
    await act(async () => { finishSave({ success: true }); await pending; });
    unsubscribe();

    expect(owners.every((owner) => owner === walletState.stakeAddress)).toBe(true);
    expect(usePreferencesDraft.getState().draft).toBe(activeDraft);
    expect(result.current.isFavorite('b1')).toBe(true);
  });

  it('keeps local favorites scoped to their wallet when switching accounts', async () => {
    getMock.mockResolvedValue({ favorites: [], dislikes: [] });
    const { result, rerender } = renderHook(() => usePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleFavorite({ assetId: 'a2', ticker: 'B', logo: '' }));

    walletState.stakeAddress = 'stake1' + 'v'.repeat(40);
    rerender();
    await waitFor(() => expect(result.current.isFavorite('a2')).toBe(false));

    walletState.stakeAddress = 'stake1' + 'u'.repeat(40);
    rerender();
    await waitFor(() => expect(result.current.isFavorite('a2')).toBe(true));
  });
});
