interface HoldingForExport {
  unit: string;
  quantity: string;
  name: string | null;
  ticker: string | null;
  decimals: number | null;
  priceUsd: number | null;
  valueUsd: number | null;
  priceObservedAt?: number | null;
  priceSource?: string | null;
}

interface WalletHoldingsExport {
  network: string;
  stakeAddress: string;
  exportedAt: string;
  walletLovelace: string | null;
  adaPriceUsd: number | null;
  holdings: HoldingForExport[];
}

function exactUnits(raw: string, decimals: number | null): string {
  if (decimals === null || !/^\d+$/.test(raw)) return '';
  if (decimals === 0) return raw;
  const padded = raw.padStart(decimals + 1, '0');
  return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
}

export function walletHoldingsCsvRows({ network, stakeAddress, exportedAt, walletLovelace, adaPriceUsd, holdings }: WalletHoldingsExport) {
  const rows: Array<Array<string | number>> = [[
    'network', 'stake_address', 'exported_at_utc', 'asset_id', 'token',
    'quantity_raw', 'decimals', 'quantity', 'price_usd', 'estimated_value_usd',
    'price_observed_at_utc', 'price_source',
  ]];
  if (walletLovelace !== null) {
    const adaQuantity = exactUnits(walletLovelace, 6);
    rows.push([
      network, stakeAddress, exportedAt, 'lovelace', 'ADA', walletLovelace, 6, adaQuantity,
      adaPriceUsd ?? '', adaPriceUsd === null ? '' : Number(adaQuantity) * adaPriceUsd, '', '',
    ]);
  }
  for (const holding of holdings) {
    rows.push([
      network, stakeAddress, exportedAt, holding.unit, holding.ticker || holding.name || holding.unit,
      holding.quantity, holding.decimals ?? '', exactUnits(holding.quantity, holding.decimals),
      holding.priceUsd ?? '', holding.valueUsd ?? '',
      holding.priceObservedAt ? new Date(holding.priceObservedAt * 1000).toISOString() : '',
      holding.priceSource ?? '',
    ]);
  }
  return rows;
}
