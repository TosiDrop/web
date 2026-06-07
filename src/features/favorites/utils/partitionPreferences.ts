export function partitionPreferences<T extends { assetId: string }>(
  tokens: T[],
  favoriteIds: Set<string>,
  dislikedIds: Set<string>,
): { visible: T[]; hidden: T[] } {
  const favorites: T[] = [];
  const rest: T[] = [];
  const hidden: T[] = [];
  for (const token of tokens) {
    if (dislikedIds.has(token.assetId)) hidden.push(token);
    else if (favoriteIds.has(token.assetId)) favorites.push(token);
    else rest.push(token);
  }
  return { visible: [...favorites, ...rest], hidden };
}
