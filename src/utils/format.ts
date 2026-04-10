/**
 * Truncate a hex hash or bech32 address for display.
 * Default: 8 leading + 6 trailing characters.
 */
export function truncateHash(value: string, leading = 8, trailing = 6): string {
  if (value.length <= leading + trailing + 3) return value;
  return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}

/** Map Cardano networkId to a human label. null → 'Mainnet' (default). */
export function getNetworkLabel(networkId: number | null): string {
  return networkId === 0 ? 'Testnet' : 'Mainnet';
}
