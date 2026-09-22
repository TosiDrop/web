import type { PublicMarketPrice } from '@/features/market/api/market.queries';
import type { ClaimableToken } from '@/shared/rewards';

export interface ClaimValueEstimate {
  usd: number;
  ada: number;
  pricedCount: number;
  totalCount: number;
}

export function estimateClaimValue(
  tokens: ClaimableToken[],
  prices: Record<string, PublicMarketPrice>,
): ClaimValueEstimate {
  return tokens.reduce<ClaimValueEstimate>((estimate, token) => {
    const price = prices[token.assetId];
    if (!price) return { ...estimate, totalCount: estimate.totalCount + 1 };
    return {
      usd: estimate.usd + (price.priceUsd ?? 0) * token.amount,
      ada: estimate.ada + (price.priceAda ?? 0) * token.amount,
      pricedCount: estimate.pricedCount + (price.priceUsd !== null || price.priceAda !== null ? 1 : 0),
      totalCount: estimate.totalCount + 1,
    };
  }, { usd: 0, ada: 0, pricedCount: 0, totalCount: 0 });
}
