import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface VmDeliveredReward {
  id: string;
  staking_address: string;
  epoch: string;
  token: string;
  amount: string;
  delivered_on: string;
  withdrawal_request: string;
  expiry: string;
}

interface TokenInfo {
  ticker?: string;
  decimals?: string | number;
  logo?: string;
  name?: string;
}

type TokenMap = Record<string, TokenInfo>;

export interface DeliveredReward {
  key: string;
  token: string;
  ticker: string;
  decimals: number;
  amount: number;
  deliveredOn: Date | null;
  deliveredOnRaw: string;
  epoch: number | null;
  logo?: string;
}

function hexToUtf8(hex: string): string {
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return hex.slice(0, 12);
  }
}

function tickerFor(token: string, info?: TokenInfo): string {
  if (token === 'lovelace') return 'ADA';
  if (info?.ticker) return info.ticker;
  const parts = token.split('.');
  return parts.length === 2 ? hexToUtf8(parts[1]) || token : token.slice(0, 12);
}

function decimalsFor(token: string, info?: TokenInfo): number {
  if (token === 'lovelace') return 6;
  return Number(info?.decimals ?? 0) || 0;
}

function parseDeliveredOn(raw: string): Date | null {
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && asNumber > 1_000_000_000 && asNumber < 10_000_000_000) {
    return new Date(asNumber * 1000);
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function useDeliveredRewards(stakeAddress: string | null) {
  return useQuery<DeliveredReward[], Error>({
    queryKey: ['delivered-rewards', stakeAddress],
    enabled: !!stakeAddress,
    staleTime: 60_000,
    queryFn: async () => {
      if (!stakeAddress) throw new Error('stakeAddress is required');

      const [rewards, tokens] = await Promise.all([
        apiClient.get<VmDeliveredReward[]>(
          `/api/getDeliveredRewards?staking_address=${encodeURIComponent(stakeAddress)}`,
        ),
        apiClient.get<TokenMap>('/api/getTokens'),
      ]);

      const grouped = new Map<string, DeliveredReward>();
      for (const row of rewards) {
        const info = tokens[row.token];
        const decimals = decimalsFor(row.token, info);
        const ticker = tickerFor(row.token, info);
        const amount = Number(row.amount) / Math.pow(10, decimals);
        const key = `${row.delivered_on}_${ticker}`;
        const epochNum = Number(row.epoch);

        const existing = grouped.get(key);
        if (existing) {
          existing.amount += amount;
        } else {
          grouped.set(key, {
            key,
            token: row.token,
            ticker,
            decimals,
            amount,
            deliveredOn: parseDeliveredOn(row.delivered_on),
            deliveredOnRaw: row.delivered_on,
            epoch: Number.isNaN(epochNum) ? null : epochNum,
            logo: info?.logo,
          });
        }
      }

      return [...grouped.values()].sort((a, b) => {
        const ta = a.deliveredOn?.getTime() ?? 0;
        const tb = b.deliveredOn?.getTime() ?? 0;
        return tb - ta;
      });
    },
  });
}
