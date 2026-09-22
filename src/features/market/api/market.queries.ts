import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { DEPLOYMENT_NETWORK } from '@/config/network';

export interface PublicMarketPrice {
  priceUsd: number | null;
  priceAda: number | null;
  priceChange24h: number | null;
  source: string;
  sourceCount: number;
  observedAt: number;
}

function normalizeUnits(units: string[]): string[] {
  return [...new Set(units.map((unit) => unit.trim()).filter(Boolean))].sort();
}

export async function fetchMarketPrices(units: string[]): Promise<Record<string, PublicMarketPrice>> {
  const requested = normalizeUnits(units);
  const batches = Array.from({ length: Math.ceil(requested.length / 100) }, (_, index) => requested.slice(index * 100, index * 100 + 100));
  if (batches.length === 0) return {};
  const responses = await Promise.all(batches.map((batch) => apiClient.get<{ prices?: Record<string, PublicMarketPrice> }>(
    `/api/market/prices?units=${encodeURIComponent(batch.join(','))}`,
  )));
  return Object.assign({}, ...responses.map((response) => response?.prices ?? {}));
}

export function useMarketPrices(units: string[]) {
  const requested = normalizeUnits(units);
  return useQuery<Record<string, PublicMarketPrice>, Error>({
    queryKey: ['market-prices', DEPLOYMENT_NETWORK, requested],
    queryFn: () => fetchMarketPrices(requested),
    enabled: requested.length > 0,
    staleTime: 60_000,
  });
}
