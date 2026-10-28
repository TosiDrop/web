import type { TokenPreferences, TokenRef } from '../types';

function key(stakeAddress: string): string {
  return `td:preferences-draft:v1:${stakeAddress}`;
}

function isTokenRef(value: unknown): value is TokenRef {
  if (!value || typeof value !== 'object') return false;
  const token = value as Record<string, unknown>;
  return typeof token.assetId === 'string' && typeof token.ticker === 'string' && typeof token.logo === 'string';
}

export function readLocalDraft(stakeAddress: string): TokenPreferences | null {
  try {
    const raw = localStorage.getItem(key(stakeAddress));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const preferences = value as Record<string, unknown>;
    if (!Array.isArray(preferences.favorites) || !preferences.favorites.every(isTokenRef) ||
        !Array.isArray(preferences.dislikes) || !preferences.dislikes.every(isTokenRef)) return null;
    return { favorites: preferences.favorites, dislikes: preferences.dislikes };
  } catch {
    return null;
  }
}

export function writeLocalDraft(stakeAddress: string, draft: TokenPreferences | null): void {
  try {
    if (draft) localStorage.setItem(key(stakeAddress), JSON.stringify(draft));
    else localStorage.removeItem(key(stakeAddress));
  } catch {
    // Preferences remain available for this session when storage is disabled.
  }
}
