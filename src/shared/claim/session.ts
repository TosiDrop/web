export function sessionIdFor(stakeAddress: string): string {
  return stakeAddress.slice(0, 40);
}
