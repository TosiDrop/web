import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { useClaimStore } from '@/store/claim-state';
import { useWalletStore } from '@/store/wallet-state';
import DepositPage from '../DepositPage';

const statusMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/deposit/hooks/useClaimStatus', () => ({ useClaimStatus: statusMock }));
vi.mock('@/features/claim/hooks/useWalletDeposit', () => ({
  useWalletDeposit: () => ({ sendDeposit: vi.fn(), canSend: false }),
}));

beforeEach(() => {
  useClaimStore.getState().reset();
  statusMock.mockReturnValue({ status: { kind: 'success' }, refetch: vi.fn(), error: null });
});

it('keeps polling and refreshing the initiating wallet after an account switch or disconnect', async () => {
  useClaimStore.getState().setRequest({
    stakeAddress: 'stake-original', requestId: 'request-original', deposit: 2000000,
    overheadFee: 0, withdrawalAddress: 'addr-original',
  });
  useWalletStore.setState({ stakeAddress: 'stake-other', connected: true });
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = <QueryClientProvider client={client}><MemoryRouter><DepositPage /></MemoryRouter></QueryClientProvider>;
  const { rerender } = render(view);
  expect(statusMock).toHaveBeenLastCalledWith({ request_id: 'request-original', staking_address: 'stake-original' });
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['history', 'stake-original'] }));
  act(() => useWalletStore.setState({ stakeAddress: null, connected: false }));
  rerender(view);
  expect(statusMock).toHaveBeenLastCalledWith({ request_id: 'request-original', staking_address: 'stake-original' });
});
