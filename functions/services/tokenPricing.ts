import type { TokenPrices } from '../../src/shared/rewards';

interface PriceFeedResponse {
  [assetId: string]: {
    price?: number;
    priceADA?: number;
    [key: string]: unknown;
  };
}

interface GetTokenPricesOptions {
  endpoint?: string;
  timeoutMs?: number;
}

const CACHE_DURATION = 5 * 60 * 1000;
let cachedPrices: TokenPrices | null = null;
let cacheTimestamp = 0;

export async function getTokenPrices(
  options: GetTokenPricesOptions = {}
): Promise<TokenPrices> {
  const { endpoint, timeoutMs = 10_000 } = options;
  const now = Date.now();

  if (cachedPrices && now - cacheTimestamp < CACHE_DURATION) {
    return cachedPrices;
  }

  if (!endpoint) {
    cachedPrices = {};
    cacheTimestamp = now;
    return cachedPrices;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Price feed returned ${response.status}: ${response.statusText}`
      );
    }

    const payload = (await response.json()) as PriceFeedResponse;
    const normalized: TokenPrices = {};

    for (const [assetId, info] of Object.entries(payload)) {
      const price =
        typeof info.priceADA === 'number'
          ? info.priceADA
          : typeof info.price === 'number'
            ? info.price
            : undefined;

      if (typeof price === 'number') {
        normalized[assetId] = price;
      }
    }

    cachedPrices = normalized;
    cacheTimestamp = now;
    return cachedPrices;
  } catch (error) {
    console.warn('Failed to fetch token prices from feed:', error);
    return cachedPrices ?? {};
  } finally {
    clearTimeout(timeoutId);
  }
}

export function clearPriceCache() {
  cachedPrices = null;
  cacheTimestamp = 0;
}

