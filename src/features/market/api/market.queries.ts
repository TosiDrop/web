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

export async function fetchMarketPrices(units: string[]): Promise<Record<string, PublicMarketPrice>> {
  const requested = [...new Set(units.map((unit) => unit.trim()).filter(Boolean))].slice(0, 100);
  if (requested.length === 0) return {};
  const response = await apiClient.get<{ prices?: Record<string, PublicMarketPrice> }>(
    `/api/market/prices?units=${encodeURIComponent(requested.join(','))}`,
  );
  return response?.prices ?? {};
}

export function useMarketPrices(units: string[]) {
  const requested = [...new Set(units.map((unit) => unit.trim()).filter(Boolean))].slice(0, 100).sort();
  return useQuery<Record<string, PublicMarketPrice>, Error>({
    queryKey: ['market-prices', DEPLOYMENT_NETWORK, requested],
    queryFn: () => fetchMarketPrices(requested),
    enabled: requested.length > 0,
    staleTime: 60_000,
  });
}
