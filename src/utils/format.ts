import { DEPLOYMENT_NETWORK } from '@/config/network';

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

export function lovelaceToAda(lovelace: number): string {
  return (lovelace / 1_000_000).toFixed(6);
}

/** Format a lovelace value as a human-readable ADA amount (locale-aware, 2-6 dp). */
export function formatAda(lovelace: number): string {
  return (lovelace / 1_000_000).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Token amounts anywhere in the profile: more decimals as the value shrinks.
 * Locale is pinned so charts, tables and captions agree with each other.
 */
export function formatTokenAmount(amount: number): string {
  const maximumFractionDigits = amount >= 1000 ? 2 : amount >= 1 ? 4 : 6;
  return amount.toLocaleString('en-US', { maximumFractionDigits });
}

export function explorerTxUrl(txHash: string): string {
  const host = DEPLOYMENT_NETWORK === 'mainnet' ? 'cexplorer.io' : 'preview.cexplorer.io';
  return `https://${host}/tx/${txHash}`;
}
