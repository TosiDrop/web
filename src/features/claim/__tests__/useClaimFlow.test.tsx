import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useClaimFlow } from '../hooks/useClaimFlow';
import { useWalletStore } from '@/store/wallet-state';
import type { ClaimStatus, DepositInfo } from '@/types/claim';

const sendDepositMock = vi.fn<(args: { toAddress: string; lovelace: number }) => Promise<string>>();
let canSendMock = true;

vi.mock('../hooks/useWalletDeposit', () => ({
  useWalletDeposit: () => ({ sendDeposit: sendDepositMock, canSend: canSendMock }),
}));

const apiPost = vi.fn() as Mock<(url: string, body: unknown) => Promise<unknown>>;
const apiGet = vi.fn() as Mock<(url: string) => Promise<unknown>>;

vi.mock('@/api/client', () => ({
  apiClient: {
    get: (url: string) => apiGet(url),
    post: (url: string, body: unknown) => apiPost(url, body),
  },
}));

const DEPOSIT: DepositInfo = {
  requestId: '42',
  deposit: 5_000_000,
  overheadFee: 1_000_000,
  withdrawalAddress: 'addr1_test',
  isWhitelisted: false,
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useClaimFlow', () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiGet.mockReset();
    sendDepositMock.mockReset();
    canSendMock = true;
    useWalletStore.setState({
      connected: true,
      walletName: 'test',
      stakeAddress: 'stake_test_abc',
      changeAddress: 'addr_test',
      networkId: 0,
    });
  });

  it('transitions idle → creating → awaiting_deposit on success', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim(['asset1']);
    });

    expect(result.current.state).toEqual({ step: 'awaiting_deposit', info: DEPOSIT });
    expect(apiPost).toHaveBeenCalledWith('/api/claim/create', {
      stakeAddress: 'stake_test_abc',
      assetIds: ['asset1'],
    });
  });

  it('surfaces a friendly error if create fails', async () => {
    apiPost.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim(['asset1']);
    });

    expect(result.current.state.step).toBe('error');
  });

  it('refuses to start without a stake address', async () => {
    useWalletStore.setState({
      connected: false,
      walletName: null,
      stakeAddress: null,
      changeAddress: null,
      networkId: null,
    });
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim(['asset1']);
    });

    expect(result.current.state.step).toBe('error');
  });

  it('refuses to start with empty assets', async () => {
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim([]);
    });

    expect(result.current.state.step).toBe('error');
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('sendDepositFromWallet advances through signing → polling', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    sendDepositMock.mockResolvedValueOnce('tx_hash_1');
    const waiting: ClaimStatus = { kind: 'waiting' };
    apiGet.mockResolvedValue(waiting);

    const { result } = renderHook(() => useClaimFlow({ pollIntervalMs: 60_000 }), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.startClaim(['a']);
    });
    expect(result.current.state.step).toBe('awaiting_deposit');

    await act(async () => {
      await result.current.sendDepositFromWallet();
    });

    expect(sendDepositMock).toHaveBeenCalledWith({
      toAddress: 'addr1_test',
      lovelace: 6_000_000,
    });
    expect(result.current.state.step).toBe('polling');
    if (result.current.state.step === 'polling') {
      expect(result.current.state.txHash).toBe('tx_hash_1');
    }
  });

  it('blocks wallet-send when wallet cannot send', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    canSendMock = false;
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim(['a']);
    });
    await act(async () => {
      await result.current.sendDepositFromWallet();
    });

    expect(result.current.state.step).toBe('error');
    expect(sendDepositMock).not.toHaveBeenCalled();
  });

  it('markDepositedExternally moves from awaiting_deposit to polling', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    const waiting: ClaimStatus = { kind: 'waiting' };
    apiGet.mockResolvedValue(waiting);
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim(['a']);
    });
    act(() => {
      result.current.markDepositedExternally();
    });

    expect(result.current.state.step).toBe('polling');
  });

  it('polling transitions to success on a success status', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    const success: ClaimStatus = { kind: 'success', txHash: 'final_hash' };
    apiGet.mockResolvedValue(success);

    const { result } = renderHook(() => useClaimFlow({ pollIntervalMs: 10 }), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.startClaim(['a']);
    });
    act(() => {
      result.current.markDepositedExternally();
    });

    await waitFor(() => expect(result.current.state.step).toBe('success'));
    if (result.current.state.step === 'success') {
      expect(result.current.state.txHash).toBe('final_hash');
    }
  });

  it('polling transitions to error on a failure status', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    const failure: ClaimStatus = { kind: 'failure', reason: 'rejected by network' };
    apiGet.mockResolvedValue(failure);

    const { result } = renderHook(() => useClaimFlow({ pollIntervalMs: 10 }), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.startClaim(['a']);
    });
    act(() => {
      result.current.markDepositedExternally();
    });

    await waitFor(() => expect(result.current.state.step).toBe('error'));
    if (result.current.state.step === 'error') {
      expect(result.current.state.message).toBe('rejected by network');
    }
  });

  it('reset returns to idle from any state', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.startClaim(['a']);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({ step: 'idle' });
  });

  it('recovers from error into a fresh claim cycle without stale polling data', async () => {
    // First claim fails during create.
    apiPost.mockRejectedValueOnce(new Error('backend down'));
    // Then a stale failure response is cached from a prior session; the fresh
    // claim must not pick it up.
    apiGet.mockResolvedValue({ kind: 'failure', reason: 'stale' } satisfies ClaimStatus);
    // Second claim succeeds at create.
    apiPost.mockResolvedValueOnce(DEPOSIT);

    const { result } = renderHook(() => useClaimFlow(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.startClaim(['a']);
    });
    expect(result.current.state.step).toBe('error');

    act(() => {
      result.current.reset();
    });
    expect(result.current.state.step).toBe('idle');

    await act(async () => {
      await result.current.startClaim(['a']);
    });
    expect(result.current.state.step).toBe('awaiting_deposit');
    // Must NOT have leapt straight to error from a stale failure result.
  });

  it('reset mid-polling stops transitions', async () => {
    apiPost.mockResolvedValueOnce(DEPOSIT);
    const waiting: ClaimStatus = { kind: 'waiting' };
    apiGet.mockResolvedValue(waiting);

    const { result } = renderHook(() => useClaimFlow({ pollIntervalMs: 10 }), { wrapper: makeWrapper() });
    await act(async () => {
      await result.current.startClaim(['a']);
    });
    act(() => {
      result.current.markDepositedExternally();
    });
    expect(result.current.state.step).toBe('polling');

    // Swap to a success response. If polling were not stopped, the state
    // would transition to success after reset.
    apiGet.mockResolvedValue({ kind: 'success', txHash: 'x' } satisfies ClaimStatus);

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({ step: 'idle' });

    // Give react-query a tick; state must remain idle.
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.state.step).toBe('idle');
  });
});
