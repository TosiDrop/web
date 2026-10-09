import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useClaimStore } from '@/store/claim-state';
import { useWalletStore } from '@/store/wallet-state';
import DepositPage from '../DepositPage';

const statusMock = vi.hoisted(() => vi.fn());
const sendDeposit = vi.hoisted(() => vi.fn());
vi.mock('@/features/deposit/hooks/useClaimStatus', () => ({ useClaimStatus: statusMock }));
vi.mock('@/features/claim/hooks/useWalletDeposit', () => ({
  useWalletDeposit: () => ({ sendDeposit, canSend: true }),
}));
vi.mock('@/features/claim/components/ClaimProgress', () => ({
  ClaimProgress: ({ stage }: { stage: string }) => <div data-testid="claim-progress">{stage}</div>,
}));

afterEach(cleanup);

beforeEach(() => {
  useClaimStore.getState().reset();
  sendDeposit.mockReset();
  statusMock.mockReturnValue({ status: { kind: 'success' }, refetch: vi.fn(), error: null });
});

function renderDeposit(initialize = true) {
  if (initialize) useClaimStore.getState().setRequest({
    stakeAddress: 'stake-original', requestId: 'request-original', deposit: 2000000,
    overheadFee: 0, withdrawalAddress: 'addr-original',
  });
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}><MemoryRouter><DepositPage /></MemoryRouter></QueryClientProvider>);
}

it('shows the wallet prompt and then confirmation, preventing a second deposit after submission', async () => {
  statusMock.mockReturnValue({ status: { kind: 'waiting' }, refetch: vi.fn(), error: null });
  let resolve!: (hash: string) => void;
  sendDeposit.mockImplementation(() => new Promise<string>((done) => { resolve = done; }));
  renderDeposit();
  expect(screen.queryByTestId('claim-progress')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Send from wallet' }));
  expect(screen.getByTestId('claim-progress')).toHaveTextContent('signing');
  const hash = '0123456789abcdef'.repeat(4);
  await act(async () => { resolve(hash); });
  expect(screen.getByTestId('claim-progress')).toHaveTextContent('confirmation');
  expect(screen.getByText(hash)).toBeVisible();
  fireEvent.click(screen.getByText('Deposit details'));
  expect(screen.getByRole('button', { name: 'Deposit submitted' })).toBeDisabled();
  expect(sendDeposit).toHaveBeenCalledOnce();
});

it('preserves signing and submitted state when the deposit page is reopened', async () => {
  statusMock.mockReturnValue({ status: { kind: 'waiting' }, refetch: vi.fn(), error: null });
  let resolve!: (hash: string) => void;
  sendDeposit.mockImplementation(() => new Promise<string>((done) => { resolve = done; }));
  const first = renderDeposit();
  fireEvent.click(screen.getByRole('button', { name: 'Send from wallet' }));
  first.unmount();
  const reopened = renderDeposit(false);
  expect(screen.getByTestId('claim-progress')).toHaveTextContent('signing');
  expect(screen.getByRole('button', { name: 'Signing...' })).toBeDisabled();
  await act(async () => { resolve('tx-deposit'); });
  reopened.unmount();
  renderDeposit(false);
  expect(screen.getByTestId('claim-progress')).toHaveTextContent('confirmation');
  fireEvent.click(screen.getByText('Deposit details'));
  expect(screen.getByRole('button', { name: 'Deposit submitted' })).toBeDisabled();
});

it.each([['processing', 'delivery'], ['success', 'complete']])('follows backend %s for a manual deposit', (kind, stage) => {
  statusMock.mockReturnValue({ status: { kind }, refetch: vi.fn(), error: null });
  renderDeposit();
  expect(screen.getByTestId('claim-progress')).toHaveTextContent(stage);
});

it('removes progress and shows the wallet rejection so the user can retry', async () => {
  statusMock.mockReturnValue({ status: { kind: 'waiting' }, refetch: vi.fn(), error: null });
  sendDeposit.mockRejectedValue(new Error('Signing cancelled'));
  renderDeposit();
  fireEvent.click(screen.getByRole('button', { name: 'Send from wallet' }));
  await screen.findByText('Signing cancelled');
  expect(screen.queryByTestId('claim-progress')).toBeNull();
  expect(screen.getByRole('button', { name: 'Send from wallet' })).toBeEnabled();
});

it('shows a status error with a retry instead of continuing the animation', () => {
  const refetch = vi.fn();
  statusMock.mockReturnValue({ status: { kind: 'processing' }, refetch, error: new Error('Offline') });
  renderDeposit();
  expect(screen.queryByTestId('claim-progress')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check status again' }));
  expect(refetch).toHaveBeenCalledOnce();
});

it('shows the failure reason instead of continuing the animation', () => {
  statusMock.mockReturnValue({ status: { kind: 'failure', reason: 'Deposit expired' }, refetch: vi.fn(), error: null });
  renderDeposit();
  expect(screen.queryByTestId('claim-progress')).toBeNull();
  expect(screen.getByText('Deposit expired')).toBeInTheDocument();
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
