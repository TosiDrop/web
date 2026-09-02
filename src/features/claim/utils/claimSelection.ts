/**
 * Hidden (disliked) tokens never ride along into a claim: every selection
 * derived here is intersected with the tokens the user can actually see.
 */
export function visibleSelection(selectedAssetIds: string[], visibleAssetIds: string[]): string[] {
  const visible = new Set(visibleAssetIds);
  return selectedAssetIds.filter((id) => visible.has(id));
}

export function toggleAllSelection(allSelected: boolean, visibleAssetIds: string[]): string[] {
  return allSelected ? [] : [...visibleAssetIds];
}
