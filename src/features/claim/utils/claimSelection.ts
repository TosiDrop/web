/**
 * Hidden (disliked) tokens never ride along into a claim: every selection
 * derived here is intersected with the tokens the user can actually see.
 */
export function visibleSelection(selectedAssetIds: string[], visibleAssetIds: string[]): string[] {
  const selected = new Set(selectedAssetIds);
  return visibleAssetIds.filter((id) => selected.has(id));
}

export function toggleAllSelection(allSelected: boolean, visibleAssetIds: string[]): string[] {
  return allSelected ? [] : [...visibleAssetIds];
}

export function limitSelection(selectedAssetIds: string[], maxAssets: number): string[] {
  return selectedAssetIds.slice(0, Math.max(0, maxAssets));
}
