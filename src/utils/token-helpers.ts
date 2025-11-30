import type { TokenPrices } from '../types/rewards';

export function isNativeToken(assetId: string): boolean {
  return assetId === '' || assetId === 'lovelace' || assetId.toLowerCase() === 'ada';
}

export function getTokenValue(
  assetId: string,
  amount: number,
  prices: TokenPrices
): { price: number; total: number } {
  const price = prices[assetId] || 0;
  const total = amount * price;

  return { price, total };
}

