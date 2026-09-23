import type { PublicMarketPrice } from '@/features/market/api/market.queries';
import type { ClaimableToken } from '@/shared/rewards';

export interface ClaimValueEstimate {
  usd: number | null;
  ada: number | null;
  usdPricedCount: number;
  adaPricedCount: number;
  pricedCount: number;
  totalCount: number;
}

export function estimateClaimValue(
  tokens: ClaimableToken[],
  prices: Record<string, PublicMarketPrice>,
): ClaimValueEstimate {
  const estimate = tokens.reduce<Omit<ClaimValueEstimate, 'usd' | 'ada'>>((result, token) => {
    const price = prices[token.assetId];
    const hasUsd = price?.priceUsd !== null && price?.priceUsd !== undefined && Number.isFinite(price.priceUsd);
    const hasAda = price?.priceAda !== null && price?.priceAda !== undefined && Number.isFinite(price.priceAda);
    return {
      usdPricedCount: result.usdPricedCount + (hasUsd ? 1 : 0),
      adaPricedCount: result.adaPricedCount + (hasAda ? 1 : 0),
      pricedCount: result.pricedCount + (hasUsd || hasAda ? 1 : 0),
      totalCount: result.totalCount + 1,
    };
  }, { usdPricedCount: 0, adaPricedCount: 0, pricedCount: 0, totalCount: 0 });

  const usd = tokens.reduce((total, token) => {
    const value = prices[token.assetId]?.priceUsd;
    return value !== null && value !== undefined && Number.isFinite(value) ? total + value * token.amount : total;
  }, 0);
  const ada = tokens.reduce((total, token) => {
    const value = prices[token.assetId]?.priceAda;
    return value !== null && value !== undefined && Number.isFinite(value) ? total + value * token.amount : total;
  }, 0);

  return { ...estimate, usd: estimate.usdPricedCount > 0 ? usd : null, ada: estimate.adaPricedCount > 0 ? ada : null };
}
