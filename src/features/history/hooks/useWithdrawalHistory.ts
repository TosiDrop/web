import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import {
  tickerFor,
  decimalsFor,
  parseDeliveredOn,
  type TokenMap,
  type DeliveredReward,
} from '@/features/history/api/history.queries';

interface HistoryItem {
  rewardId: string;
  token: string;
  amount: string;
  epoch: number | null;
  deliveredOn: string;
  deliveredAt: number | null;
  withdrawalRequest: string | null;
}

interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  degraded?: boolean;
}

export interface WithdrawalHistoryPage {
  // Same display shape HistoryRow consumes.
  rows: DeliveredReward[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  degraded: boolean;
}

export type HistoryOrder = 'asc' | 'desc';

export function useWithdrawalHistory(
  stakeAddress: string | null,
  page: number,
  order: HistoryOrder,
) {
  return useQuery<WithdrawalHistoryPage, Error>({
    queryKey: ['history', stakeAddress, page, order],
    enabled: !!stakeAddress,
    staleTime: 60_000,
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const [history, tokens] = await Promise.all([
        apiClient.get<HistoryResponse>(
          `/api/history?staking_address=${encodeURIComponent(stakeAddress)}&page=${page}&order=${order}`,
        ),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);

      const rows: DeliveredReward[] = (history.items ?? []).map((item) => {
        const info = tokens[item.token];
        const decimals = decimalsFor(item.token, info);
        return {
          key: item.rewardId,
          token: item.token,
          ticker: tickerFor(item.token, info),
          decimals,
          amount: Number(item.amount) / Math.pow(10, decimals),
          deliveredOn: parseDeliveredOn(item.deliveredOn),
          deliveredOnRaw: item.deliveredOn,
          epoch: item.epoch,
          logo: info?.logo,
        };
      });

      return {
        rows,
        page: history.page,
        limit: history.limit,
        total: history.total,
        hasMore: history.hasMore,
        degraded: history.degraded ?? false,
      };
    },
  });
}
