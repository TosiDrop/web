export function sortFavoritesFirst<T extends { assetId: string }>(
  tokens: T[],
  favoriteIds: Set<string> | string[],
): T[] {
  const favSet = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds);
  const favorites: T[] = [];
  const rest: T[] = [];
  for (const token of tokens) {
    (favSet.has(token.assetId) ? favorites : rest).push(token);
  }
  return [...favorites, ...rest];
}
