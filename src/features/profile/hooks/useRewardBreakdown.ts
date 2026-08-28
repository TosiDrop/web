import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { TokenMap } from '@/features/history/api/history.queries';
import { normalizeBreakdown, type BreakdownEntry } from '@/features/profile/utils/normalizeBreakdown';

export interface BreakdownGroup {
  token: string;
  ticker: string;
  logo?: string;
  total: number;
  entries: BreakdownEntry[];
}

interface RawBreakdownResponse {
  rewards?: unknown[];
  promises?: unknown[];
  vending_address?: string;
  withdrawal_fee?: string;
}

export function useRewardBreakdown(stakeAddress: string | null) {
  return useQuery<BreakdownGroup[], Error>({
    queryKey: ['reward-breakdown', stakeAddress],
    enabled: !!stakeAddress,
    staleTime: 60_000,
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');
      const [raw, tokens] = await Promise.all([
        apiClient.get<RawBreakdownResponse>(
          `/api/getRewardBreakdown?staking_address=${encodeURIComponent(stakeAddress)}`,
        ),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);

      const entries = normalizeBreakdown(raw, tokens);
      const groups = new Map<string, BreakdownGroup>();
      for (const entry of entries) {
        const existing = groups.get(entry.token);
        if (existing) {
          existing.total += entry.amount;
          existing.entries.push(entry);
        } else {
          groups.set(entry.token, {
            token: entry.token,
            ticker: entry.ticker,
            logo: entry.logo,
            total: entry.amount,
            entries: [entry],
          });
        }
      }
      return [...groups.values()].sort((a, b) => b.total - a.total);
    },
  });
}
