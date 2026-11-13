import { apiClient } from '@/api/client';
import { decimalsFor, hasKnownDecimals, tickerFor, type TokenMap } from '@/features/history/api/history.queries';
import { downloadCsv } from '@/utils/csv';
import type { HistoryItem, HistoryResponse } from '../hooks/useWithdrawalHistory';

export async function fetchAllHistory(stakeAddress: string): Promise<HistoryItem[]> {
  const items: HistoryItem[] = [];
  for (let page = 1; page <= 1000; page += 1) {
    const result = await apiClient.get<HistoryResponse>(
      `/api/history?staking_address=${encodeURIComponent(stakeAddress)}&page=${page}&limit=100&order=desc`,
    );
    if (result.degraded) throw new Error('The indexed claim archive is unavailable. Try again later.');
    items.push(...result.items);
    if (!result.hasMore) return items;
  }
  throw new Error('The archive exceeds the CSV export limit of 100,000 rewards.');
}

export function historyCsvRows(items: HistoryItem[], tokens: TokenMap) {
  return [
    ['reward_id', 'delivered_at_utc', 'epoch', 'token_id', 'ticker', 'amount', 'receipt_price_usd', 'estimated_value_usd', 'price_observed_at_utc', 'price_source', 'raw_amount'],
    ...items.map((item) => {
      const decimals = decimalsFor(item.token, tokens[item.token]);
      const decimalsKnown = hasKnownDecimals(item.token, tokens[item.token]);
      const amount = Number(item.amount) / 10 ** decimals;
      const price = item.receiptPriceUsd;
      return [
        item.rewardId,
        item.deliveredAt === null ? '' : new Date(item.deliveredAt * 1000).toISOString(),
        item.epoch,
        item.token,
        tickerFor(item.token, tokens[item.token]),
        decimalsKnown && Number.isFinite(amount) ? amount : '',
        price ?? '',
        price === null || price === undefined || !decimalsKnown || !Number.isFinite(amount) ? '' : amount * price,
        item.receiptPriceObservedAt ? new Date(item.receiptPriceObservedAt * 1000).toISOString() : '',
        item.receiptPriceSource ?? '',
        item.amount,
      ];
    }),
  ];
}

export async function exportHistoryCsv(stakeAddress: string): Promise<void> {
  const [items, tokens] = await Promise.all([
    fetchAllHistory(stakeAddress),
    apiClient.get<TokenMap>('/api/getTokens').catch(() => ({})),
  ]);
  downloadCsv(`tosidrop-claims-${new Date().toISOString().slice(0, 10)}.csv`, historyCsvRows(items, tokens));
}
