/**
 * Truncate a hex hash or bech32 address for display.
 * Default: 8 leading + 6 trailing characters.
 */
export function truncateHash(value: string, leading = 8, trailing = 6): string {
  if (value.length <= leading + trailing + 3) return value;
  return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}

/** Map Cardano networkId to a human label. */
export function getNetworkLabel(networkId: number | null): string {
  if (networkId === null) return 'Unknown';
  return networkId === 0 ? 'Preview' : 'Mainnet';
}

/** Convert lovelace (1/1,000,000 ADA) to ADA string. */
export function lovelaceToAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(6);
}
