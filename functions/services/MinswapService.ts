const MIN_PAIRS_API =
  "https://api-mainnet-prod.minswap.org/coinmarketcap/v2/pairs";

interface PriceInfo {
  price?: number;
  priceADA?: number;
  [key: string]: unknown;
}

export type PriceInfoMap = Record<string, PriceInfo>;

let pricesCache: PriceInfoMap | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export async function getPrices(): Promise<PriceInfoMap> {
  const now = Date.now();
  if (pricesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return pricesCache;
  }

  try {
    const response = await fetch(MIN_PAIRS_API, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Minswap API returned ${response.status}: ${response.statusText}`);
    }

    const prices = (await response.json()) as PriceInfoMap;
    
    pricesCache = prices;
    cacheTimestamp = now;
    
    return prices;
  } catch (error) {
    console.warn("Fail to fetch price info from minswap:", error);
    return pricesCache || {};
  }
}

export function getPriceForAsset(assetId: string, prices: PriceInfoMap): number {
  const priceInfo = prices[assetId];
  if (!priceInfo) return 0;
  
  return (priceInfo.priceADA ?? priceInfo.price ?? 0) as number;
}

export function convertToSimplePrices(prices: PriceInfoMap): Record<string, number> {
  const simplePrices: Record<string, number> = {};
  for (const assetId of Object.keys(prices)) {
    simplePrices[assetId] = getPriceForAsset(assetId, prices);
  }
  return simplePrices;
}

export function clearCache(): void {
  pricesCache = null;
  cacheTimestamp = 0;
}

