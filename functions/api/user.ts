import { sql, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../../db/schema';
import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

const MAX_NAME_LEN = 50;
const MAX_BIO_LEN = 280;
const MAX_AVATAR_BYTES = 600_000;

// D1 may not be bound in local dev if the operator hasn't provisioned one yet.
// Treat a missing binding as "no data" rather than crashing the onboarding flow.
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
    return jsonResponse({ exists: false, user: null, degraded: true }, 200, origin);
  }

  try {
    const db = drizzle(env.DB);
    const row = await db
      .select()
      .from(users)
      .where(eq(users.stakeAddress, stakeAddress))
      .get();

    if (!row) {
      return jsonResponse({ exists: false, user: null }, 200, origin);
    }

    return jsonResponse({
      exists: true,
      user: {
        stakeAddress: row.stakeAddress,
        displayName: row.displayName,
        bio: row.bio,
        avatarUrl: row.avatarUrl,
        walletProvider: row.walletProvider,
        onboardingCompleted: row.onboardingCompleted === 1,
        createdAt: row.createdAt,
      },
    }, 200, origin);
  } catch (err) {
    console.error('D1 GET user error:', err);
    return errorResponse('Error fetching user', 500, origin);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return errorResponse('Request body must be JSON', 415, origin);
  }

  let body: {
    stakeAddress: string;
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    walletProvider?: string;
    onboardingCompleted?: boolean;
    // Signed message proving ownership of the stake address. Carried today for
    // forward-compatibility; server-side verification (CIP-30) is tracked as
    // a cross-cutting follow-up so it can upgrade profileData + user in one PR.
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

  if (body.displayName && body.displayName.length > MAX_NAME_LEN) {
    return errorResponse(`displayName exceeds ${MAX_NAME_LEN} chars`, 400, origin);
  }
  if (body.bio && body.bio.length > MAX_BIO_LEN) {
    return errorResponse(`bio exceeds ${MAX_BIO_LEN} chars`, 400, origin);
  }
  if (body.avatarUrl && body.avatarUrl.length > MAX_AVATAR_BYTES) {
    return errorResponse('avatar exceeds 600KB', 413, origin);
  }

  if (!hasDb(env)) {
    // In dev without D1 configured, no-op but return success so UX proceeds.
    return jsonResponse({ success: true, stakeAddress: body.stakeAddress, degraded: true }, 200, origin);
  }

  try {
    const db = drizzle(env.DB);

    await db
      .insert(users)
      .values({
        stakeAddress: body.stakeAddress,
        displayName: body.displayName ?? null,
        bio: body.bio ?? null,
        avatarUrl: body.avatarUrl ?? null,
        walletProvider: body.walletProvider ?? null,
        onboardingCompleted: body.onboardingCompleted ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: users.stakeAddress,
        set: {
          displayName: sql`COALESCE(excluded.display_name, ${users.displayName})`,
          bio: sql`COALESCE(excluded.bio, ${users.bio})`,
          avatarUrl: sql`COALESCE(excluded.avatar_url, ${users.avatarUrl})`,
          walletProvider: sql`COALESCE(excluded.wallet_provider, ${users.walletProvider})`,
          onboardingCompleted: sql`COALESCE(excluded.onboarding_completed, ${users.onboardingCompleted})`,
          updatedAt: sql`(datetime('now'))`,
        },
      });

    return jsonResponse({ success: true, stakeAddress: body.stakeAddress }, 200, origin);
  } catch (err) {
    console.error('D1 POST user error:', err);
    return errorResponse('Error saving user', 500, origin);
  }
};

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const origin = context.request.headers.get('Origin');
  return optionsResponse(origin);
};
