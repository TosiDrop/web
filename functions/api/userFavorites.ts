import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { verifyStakeSignature } from '../services/verifyStakeSignature';

const MAX_FAVORITES = 200;
const MAX_ASSET_ID_LEN = 120;
const MAX_TICKER_LEN = 50;
const MAX_LOGO_LEN = 600_000;

interface FavoriteRow {
  asset_id: string;
  ticker: string | null;
  logo: string | null;
}

function hasDb(env: Env): env is Env & { DB: D1Database } {
  return typeof env?.DB?.prepare === 'function';
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakeAddress = new URL(request.url).searchParams.get('stakeAddress');

  if (!stakeAddress) {
    return errorResponse('stakeAddress is required', 400, origin);
  }
  if (!hasDb(env)) {
    return jsonResponse({ favorites: [], degraded: true }, 200, origin);
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT asset_id, ticker, logo FROM user_favorites WHERE stake_address = ? ORDER BY position ASC',
    ).bind(stakeAddress).all<FavoriteRow>();

    const favorites = (results ?? []).map((r) => ({
      assetId: r.asset_id,
      ticker: r.ticker ?? '',
      logo: r.logo ?? '',
    }));
    return jsonResponse({ favorites }, 200, origin);
  } catch (err) {
    console.error('D1 GET favorites error:', err);
    return errorResponse('Error fetching favorites', 500, origin);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return errorResponse('Request body must be JSON', 415, origin);
  }

  let body: {
    stakeAddress?: string;
    favorites?: Array<{ assetId?: unknown; ticker?: unknown; logo?: unknown }>;
    signature?: string;
    key?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, origin);
  }

  if (!body.stakeAddress || !body.stakeAddress.startsWith('stake')) {
    return errorResponse('stakeAddress must be a bech32 stake address', 400, origin);
  }
  if (!Array.isArray(body.favorites)) {
    return errorResponse('favorites must be an array', 400, origin);
  }
  if (body.favorites.length > MAX_FAVORITES) {
    return errorResponse(`favorites exceeds ${MAX_FAVORITES}`, 400, origin);
  }

  const seen = new Set<string>();
  const favorites: { assetId: string; ticker: string; logo: string }[] = [];
  for (const f of body.favorites) {
    if (!f || typeof f.assetId !== 'string' || !f.assetId || f.assetId.length > MAX_ASSET_ID_LEN) {
      return errorResponse('each favorite needs a valid assetId', 400, origin);
    }
    if (seen.has(f.assetId)) continue;
    seen.add(f.assetId);
    const ticker = typeof f.ticker === 'string' ? f.ticker.slice(0, MAX_TICKER_LEN) : '';
    const logo = typeof f.logo === 'string' && f.logo.length <= MAX_LOGO_LEN ? f.logo : '';
    favorites.push({ assetId: f.assetId, ticker, logo });
  }

  const verification = await verifyStakeSignature({
    stakeAddress: body.stakeAddress,
    favorites: favorites.map((f) => f.assetId),
    signature: body.signature,
    key: body.key,
    message: body.message,
  });
  if (!verification.ok) {
    return errorResponse(verification.reason, verification.status, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse({ success: true, count: favorites.length, degraded: true }, 200, origin);
  }

  try {
    const stake = body.stakeAddress;
    const statements = [
      env.DB.prepare('DELETE FROM user_favorites WHERE stake_address = ?').bind(stake),
      ...favorites.map((f, i) =>
        env.DB.prepare(
          'INSERT INTO user_favorites (stake_address, asset_id, ticker, logo, position) VALUES (?, ?, ?, ?, ?)',
        ).bind(stake, f.assetId, f.ticker, f.logo, i),
      ),
    ];
    await env.DB.batch(statements);
    return jsonResponse({ success: true, count: favorites.length }, 200, origin);
  } catch (err) {
    console.error('D1 POST favorites error:', err);
    return errorResponse('Error saving favorites', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin');
  return optionsResponse(origin);
};
