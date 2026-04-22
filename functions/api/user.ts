import type { Env } from '../types/env';
import { jsonResponse, errorResponse, optionsResponse } from '../services/vmClient';

interface UserRow {
  stake_address: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  wallet_provider: string | null;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');
  const stakeAddress = new URL(request.url).searchParams.get('stakeAddress');

  if (!stakeAddress) {
    return errorResponse('stakeAddress is required', 400, origin);
  }

  try {
    const row = await env.DB.prepare(
      'SELECT * FROM users WHERE stake_address = ?'
    ).bind(stakeAddress).first<UserRow>();

    if (!row) {
      return jsonResponse({ exists: false, user: null }, 200, origin);
    }

    return jsonResponse({
      exists: true,
      user: {
        stakeAddress: row.stake_address,
        displayName: row.display_name,
        bio: row.bio,
        avatarUrl: row.avatar_url,
        walletProvider: row.wallet_provider,
        onboardingCompleted: row.onboarding_completed === 1,
        createdAt: row.created_at,
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
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON', 400, origin);
  }

  if (!body.stakeAddress) {
    return errorResponse('Missing stakeAddress', 400, origin);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO users (stake_address, display_name, bio, avatar_url, wallet_provider, onboarding_completed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(stake_address) DO UPDATE SET
        display_name = COALESCE(excluded.display_name, users.display_name),
        bio = COALESCE(excluded.bio, users.bio),
        avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
        wallet_provider = COALESCE(excluded.wallet_provider, users.wallet_provider),
        onboarding_completed = COALESCE(excluded.onboarding_completed, users.onboarding_completed),
        updated_at = datetime('now')
    `).bind(
      body.stakeAddress,
      body.displayName ?? null,
      body.bio ?? null,
      body.avatarUrl ?? null,
      body.walletProvider ?? null,
      body.onboardingCompleted ? 1 : 0,
    ).run();

    return jsonResponse({ success: true, stakeAddress: body.stakeAddress }, 200, origin);
  } catch (err) {
    console.error('D1 POST user error:', err);
    return errorResponse('Error saving user', 500, origin);
  }
};

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin');
  return optionsResponse(origin);
};
