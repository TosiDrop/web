export interface TokenRef {
  assetId: string;
  ticker: string;
  logo: string;
}

export interface TokenPreferences {
  favorites: TokenRef[];
  dislikes: TokenRef[];
}

export const EMPTY_PREFERENCES: TokenPreferences = { favorites: [], dislikes: [] };
