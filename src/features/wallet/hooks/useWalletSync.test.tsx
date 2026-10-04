import { act, renderHook, waitFor } from '@testing-library/react';
import { bech32 } from 'bech32';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAINNET_STAKE } from '@/shared/__tests__/stakeAddresses';
import { useWalletStore } from '@/store/wallet-state';
import { useWalletSync } from './useWalletSync';

const { useWalletMock, useNetworkMock } = vi.hoisted(() => ({
  useWalletMock: vi.fn(),
  useNetworkMock: vi.fn(),
}));

vi.mock('@meshsdk/react', () => ({
  useWallet: useWalletMock,
  useNetwork: useNetworkMock,
}));

function stakeAddressHex(address: string): string {
  const words = bech32.decode(address).words;
  return Array.from(bech32.fromWords(words), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('useWalletSync', () => {
  let resolveChangeAddress: (address: string) => void = () => {};
  let rejectChangeAddress: (error: Error) => void = () => {};
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useWalletStore.getState().resetWallet();
    errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const changeAddress = new Promise<string>((resolve, reject) => {
      resolveChangeAddress = resolve;
      rejectChangeAddress = reject;
    });
    useWalletMock.mockReturnValue({
      wallet: {
        getRewardAddresses: vi.fn().mockResolvedValue([stakeAddressHex(MAINNET_STAKE)]),
        getChangeAddress: vi.fn(() => changeAddress),
      },
      connected: true,
      name: 'Test Wallet',
      disconnect: vi.fn(),
      setPersist: vi.fn(),
    });
    useNetworkMock.mockReturnValue(1);
  });

  afterEach(() => {
    rejectChangeAddress(new Error('change address unavailable'));
    errorLog.mockRestore();
    vi.clearAllMocks();
  });

  it('keeps the stake address available when the change address lookup rejects', async () => {
    renderHook(() => useWalletSync());

    await waitFor(() => {
      expect(useWalletMock.mock.results[0]?.value.wallet.getChangeAddress).toHaveBeenCalledOnce();
    });

    expect(useWalletStore.getState()).toMatchObject({
      connected: true,
      stakeAddress: MAINNET_STAKE,
      changeAddress: null,
      networkId: 1,
    });

    await act(async () => {
      rejectChangeAddress(new Error('change address unavailable'));
    });
    await waitFor(() => expect(errorLog).toHaveBeenCalled());

    expect(useWalletStore.getState().stakeAddress).toBe(MAINNET_STAKE);
  });

  it('stores the change address when it becomes available without losing the stake address', async () => {
    renderHook(() => useWalletSync());

    await waitFor(() => {
      expect(useWalletMock.mock.results[0]?.value.wallet.getChangeAddress).toHaveBeenCalledOnce();
    });

    await act(async () => {
      resolveChangeAddress('change-address');
    });
    await waitFor(() => {
      expect(useWalletStore.getState().changeAddress).toBe('change-address');
    });

    expect(useWalletStore.getState().stakeAddress).toBe(MAINNET_STAKE);
  });
});
