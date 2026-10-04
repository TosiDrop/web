import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/types/api';
import { useWalletStore, type WalletInstance } from '@/store/wallet-state';
import { WalletComposition } from '../WalletComposition';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('@/api/client', () => ({
  apiClient: { get: apiGet },
}));

function renderWallet() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WalletComposition />
    </QueryClientProvider>,
  );
}

describe('WalletComposition', () => {
  beforeEach(() => {
    apiGet.mockReset();
    useWalletStore.setState({
      connected: true,
      walletName: 'test',
      stakeAddress: 'stake1invalidchecksum',
      changeAddress: 'addr1test',
      networkId: 1,
      wallet: { getLovelace: async () => '1000000' } as unknown as WalletInstance,
    });
  });

  afterEach(cleanup);

  it('shows the stake-address rejection instead of a generic syncing fallback', async () => {
    apiGet.mockRejectedValueOnce(new ApiError('Enter a valid mainnet stake address.', 400));
    renderWallet();

    await waitFor(() => {
      expect(screen.getByText(/Wallet address rejected/)).toBeInTheDocument();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid mainnet stake address.');
    expect(screen.queryByText(/wallet data is unavailable right now/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Rewards available')).not.toBeInTheDocument();
  });
});
