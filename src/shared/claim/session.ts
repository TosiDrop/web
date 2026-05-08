/**
 * Deterministic session id derived from a stake address. Shared between the
 * client (`getCustomRewards` helper) and the server (`vmClient`) so a single
 * VM-side session pairs with whatever entry point the user came through.
 */
export function sessionIdFor(stakeAddress: string): string {
  return stakeAddress.slice(0, 40);
}
