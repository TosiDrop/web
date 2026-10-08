import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryList } from '../HistoryList';

const getMock = vi.hoisted(() => vi.fn());
vi.mock('@/api/client', () => ({ apiClient: { get: getMock } }));
vi.mock('@/store/wallet-state', () => ({
  useWalletStore: (select: (state: { stakeAddress: string }) => unknown) => select({ stakeAddress: 'stake-test' }),
}));

beforeEach(() => { getMock.mockReset(); });

describe('claim history quantities', () => {
  it.each([true, false])('labels exact raw amounts without token metadata (archive: %s)', async (archive) => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/api/getTokens') return {};
      if (url.startsWith('/api/getDeliveredRewards')) return [{
        id: 'r1', token: 'policy.544f5349', amount: '9007199254740993', epoch: '500',
        delivered_on: '1750000000', withdrawal_request: 'w1',
      }];
      return {
        items: archive ? [{ rewardId: 'r1', token: 'policy.544f5349', amount: '9007199254740993', epoch: 500,
          deliveredOn: '1750000000', deliveredAt: 1750000000, withdrawalRequest: 'w1' }] : [],
        total: archive ? 1 : 0, page: 1, limit: 50, hasMore: false, degraded: !archive,
      };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter><HistoryList /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText('raw units')).toBeInTheDocument();
    expect(screen.getByText('raw units').parentElement).toHaveTextContent('+9,007,199,254,740,993');
    expect(screen.getByText('Receipt value unavailable')).toBeInTheDocument();
  });
});
