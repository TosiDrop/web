import type { Network } from '@/store/network-state';

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

/** Convert lovelace (1/1,000,000 ADA) to ADA string with fixed 6 decimals. */
export function lovelaceToAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(6);
}

/** Locale-aware ADA formatter — drops trailing zeros, between 2 and 6 fractional digits. */
export function formatAda(lovelace: number): string {
  return (lovelace / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/** Cexplorer URL for a given Cardano transaction hash. */
export function explorerTxUrl(txHash: string, network: Network = 'mainnet'): string {
  const host = network === 'mainnet' ? 'cexplorer.io' : 'preview.cexplorer.io';
  return `https://${host}/tx/${txHash}`;
}
