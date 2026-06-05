import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';
import { verifyStakeSignature } from '../services/verifyStakeSignature';

const MAX_PER_LIST = 200;
const MAX_ASSET_ID_LEN = 120;
const MAX_TICKER_LEN = 50;
const MAX_LOGO_LEN = 600_000;

interface PreferenceRow {
  asset_id: string;
  ticker: string | null;
  logo: string | null;
  kind: 'favorite' | 'dislike';
}

interface TokenRefInput {
  assetId?: unknown;
  ticker?: unknown;
  logo?: unknown;
}

interface TokenRef {
  assetId: string;
  ticker: string;
  logo: string;
}

function hasDb(env: Env): env is Env & { DB: D1Database } {
  return typeof env?.DB?.prepare === 'function';
}

// Returns the sanitized, deduped list — or an error string.
function sanitizeList(raw: unknown, label: string): TokenRef[] | string {
  if (!Array.isArray(raw)) return `${label} must be an array`;
  if (raw.length > MAX_PER_LIST) return `${label} exceeds ${MAX_PER_LIST}`;
  const seen = new Set<string>();
  const out: TokenRef[] = [];
  for (const f of raw as TokenRefInput[]) {
    if (!f || typeof f.assetId !== 'string' || !f.assetId || f.assetId.length > MAX_ASSET_ID_LEN) {
      return `each ${label} entry needs a valid assetId`;
    }
    if (seen.has(f.assetId)) continue;
    seen.add(f.assetId);
    const ticker = typeof f.ticker === 'string' ? f.ticker.slice(0, MAX_TICKER_LEN) : '';
    const logo = typeof f.logo === 'string' && f.logo.length <= MAX_LOGO_LEN ? f.logo : '';
    out.push({ assetId: f.assetId, ticker, logo });
  }
  return out;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakeAddress = new URL(request.url).searchParams.get('stakeAddress');

  if (!stakeAddress) {
    return errorResponse('stakeAddress is required', 400, origin);
  }
  if (!hasDb(env)) {
    return jsonResponse({ favorites: [], dislikes: [], degraded: true }, 200, origin);
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT asset_id, ticker, logo, kind FROM token_preferences WHERE stake_address = ? ORDER BY kind ASC, position ASC',
    ).bind(stakeAddress).all<PreferenceRow>();

    const favorites: TokenRef[] = [];
    const dislikes: TokenRef[] = [];
    for (const r of results ?? []) {
      const ref = { assetId: r.asset_id, ticker: r.ticker ?? '', logo: r.logo ?? '' };
      (r.kind === 'dislike' ? dislikes : favorites).push(ref);
    }
    return jsonResponse({ favorites, dislikes }, 200, origin);
  } catch (err) {
    console.error('D1 GET token preferences error:', err);
    return errorResponse('Error fetching token preferences', 500, origin);
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
    favorites?: unknown;
    dislikes?: unknown;
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

  const favorites = sanitizeList(body.favorites, 'favorites');
  if (typeof favorites === 'string') return errorResponse(favorites, 400, origin);
  const dislikes = sanitizeList(body.dislikes, 'dislikes');
  if (typeof dislikes === 'string') return errorResponse(dislikes, 400, origin);

  const favoriteIds = new Set(favorites.map((f) => f.assetId));
  if (dislikes.some((d) => favoriteIds.has(d.assetId))) {
    return errorResponse('a token cannot be both favorite and disliked', 400, origin);
  }

  const verification = await verifyStakeSignature({
    stakeAddress: body.stakeAddress,
    favorites: favorites.map((f) => f.assetId),
    dislikes: dislikes.map((d) => d.assetId),
    signature: body.signature,
    key: body.key,
    message: body.message,
  });
  if (!verification.ok) {
    return errorResponse(verification.reason, verification.status, origin);
  }

  if (!hasDb(env)) {
    return jsonResponse(
      { success: true, count: favorites.length + dislikes.length, degraded: true },
      200,
      origin,
    );
  }

  try {
    const stake = body.stakeAddress;
    const insert = (ref: TokenRef, kind: 'favorite' | 'dislike', i: number) =>
      env.DB.prepare(
        'INSERT INTO token_preferences (stake_address, asset_id, ticker, logo, kind, position) VALUES (?, ?, ?, ?, ?, ?)',
      ).bind(stake, ref.assetId, ref.ticker, ref.logo, kind, i);

    await env.DB.batch([
      env.DB.prepare('DELETE FROM token_preferences WHERE stake_address = ?').bind(stake),
      ...favorites.map((f, i) => insert(f, 'favorite', i)),
      ...dislikes.map((d, i) => insert(d, 'dislike', i)),
    ]);
    return jsonResponse({ success: true, count: favorites.length + dislikes.length }, 200, origin);
  } catch (err) {
    console.error('D1 POST token preferences error:', err);
    return errorResponse('Error saving token preferences', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin');
  return optionsResponse(origin);
};
