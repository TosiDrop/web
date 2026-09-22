import type { Env } from '../../types/env';
import { deploymentNetwork, errorResponse, optionsResponse, withCache } from '../../services/vmClient';
import { readMarketPrices, type MarketPrice } from '../../services/marketPrices';

const MAX_UNITS = 100;
const MAX_UNIT_LENGTH = 160;
const UNIT_PATTERN = /^[a-zA-Z0-9._-]+$/;

function requestedUnits(request: Request): string[] | null {
  const raw = new URL(request.url).searchParams.get('units');
  if (!raw) return [];
  const units = [...new Set(raw.split(',').map((unit) => unit.trim()).filter(Boolean))];
  if (units.length > MAX_UNITS || units.some((unit) => unit.length > MAX_UNIT_LENGTH || !UNIT_PATTERN.test(unit))) {
    return null;
  }
  return units;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const units = requestedUnits(request);
  if (units === null) return errorResponse('Invalid market asset units', 400, origin);

  try {
    return await withCache(
      request,
      env,
      60,
      async () => {
        const prices = await readMarketPrices(env, deploymentNetwork(env), units);
        const serialized = Object.fromEntries([...prices].map(([unit, price]) => [unit, price]));
        return {
          network: deploymentNetwork(env),
          prices: serialized as Record<string, MarketPrice>,
          degraded: units.length > 0 && prices.size === 0,
          source: 'd1-read-model',
        };
      },
      context.waitUntil?.bind(context),
      'd1-market-read-model',
    );
  } catch (error) {
    console.error('market prices error:', error);
    return errorResponse('Failed to read market prices', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async ({ request }) =>
  optionsResponse(request.headers.get('Origin'));
