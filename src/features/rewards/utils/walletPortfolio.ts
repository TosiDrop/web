import { decimalAmountToNumber } from '@/shared/amounts';
import type { WalletHolding, WalletSummary } from '../types/walletSummary';

export function holdingName(holding: WalletHolding): string {
  return holding.ticker || holding.name || holding.unit;
}

export function formatWalletUnits(raw: string, decimals: number): string {
  if (
    !/^\d+$/.test(raw) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 255
  )
    return raw;
  const amount = BigInt(raw);
  const displayDecimals =
    amount > 0n && amount < 10n ** BigInt(Math.max(0, decimals - 4))
      ? decimals
      : Math.min(decimals, 4);
  const divisor = 10n ** BigInt(decimals - displayDecimals);
  const rounded = divisor > 1n ? (amount + divisor / 2n) / divisor : amount;
  const scale = 10n ** BigInt(displayDecimals);
  const whole = rounded / scale;
  const fraction = (rounded % scale)
    .toString()
    .padStart(displayDecimals, '0')
    .replace(/0+$/, '');
  return `${whole.toLocaleString('en-US')}${fraction ? `.${fraction}` : ''}`;
}

export function walletUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value > 0 && value < 0.01) return `$${value.toPrecision(3)}`;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

export function walletPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `$${value.toLocaleString('en-US', { maximumSignificantDigits: 5 })}`;
}

export function walletPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function portfolioMetrics(
  summary: WalletSummary,
  walletLovelace: string | null,
) {
  const adaAmount =
    walletLovelace === null ? null : decimalAmountToNumber(walletLovelace, 6);
  const adaUsd =
    adaAmount === null || summary.balance.adaPriceUsd === null
      ? null
      : adaAmount * summary.balance.adaPriceUsd;
  const priced = summary.holdings.filter(
    (holding) => holding.valueUsd !== null && Number.isFinite(holding.valueUsd),
  );
  const tokenUsd = priced.reduce(
    (total, holding) => total + holding.valueUsd!,
    0,
  );
  const totalUsd =
    adaUsd === null && priced.length === 0 ? null : (adaUsd ?? 0) + tokenUsd;
  const unpriced = summary.holdings.length - priced.length;
  const allocation = [
    { id: 'lovelace', name: 'ADA', value: adaUsd ?? 0 },
    ...priced.map((holding) => ({
      id: holding.unit,
      name: holdingName(holding),
      value: holding.valueUsd!,
    })),
  ]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  const priceMoves = [
    { value: adaUsd, change: summary.balance.adaPriceChange24h },
    ...priced.map((holding) => ({
      value: holding.valueUsd,
      change: holding.priceChange24h,
    })),
  ].filter((item) => item.value !== null && item.value > 0);
  const knownMoves = priceMoves.filter(
    (item) =>
      item.change !== null &&
      Number.isFinite(item.change) &&
      item.change > -100,
  );
  const priorUsd = knownMoves.reduce(
    (sum, item) => sum + item.value! / (1 + item.change! / 100),
    0,
  );
  const currentUsd = knownMoves.reduce((sum, item) => sum + item.value!, 0);
  return {
    adaUsd,
    totalUsd,
    priced,
    unpriced,
    allocation,
    partial: unpriced > 0 || adaUsd === null || summary.degraded,
    averageTokenUsd: priced.length ? tokenUsd / priced.length : null,
    marketChangePct:
      priorUsd > 0 ? ((currentUsd - priorUsd) / priorUsd) * 100 : null,
    marketChangeComplete:
      unpriced === 0 &&
      adaUsd !== null &&
      !summary.degraded &&
      knownMoves.length === priceMoves.length,
  };
}

export function stakingEpochs(
  epochs: NonNullable<WalletSummary['rewards']>['epochs'],
) {
  const grouped = new Map<number, bigint>();
  for (const row of epochs) {
    if (
      row.epoch === null ||
      !Number.isSafeInteger(row.epoch) ||
      !/^\d+$/.test(row.amountLovelace)
    )
      continue;
    grouped.set(
      row.epoch,
      (grouped.get(row.epoch) ?? 0n) + BigInt(row.amountLovelace),
    );
  }
  return [...grouped]
    .sort(([a], [b]) => a - b)
    .map(([epoch, amount]) => ({
      epoch,
      amountAda: decimalAmountToNumber(amount.toString(), 6),
    }));
}

export type HoldingsSort = 'value' | 'name' | 'change';
export function visibleHoldings(
  holdings: WalletHolding[],
  search: string,
  sort: HoldingsSort,
) {
  const query = search.trim().toLowerCase();
  return holdings
    .filter((holding) =>
      [holding.name, holding.ticker, holding.unit].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    )
    .sort((a, b) => {
      if (sort === 'name') return holdingName(a).localeCompare(holdingName(b));
      const aValue = sort === 'value' ? a.valueUsd : a.priceChange24h;
      const bValue = sort === 'value' ? b.valueUsd : b.priceChange24h;
      if (aValue === null)
        return bValue === null
          ? holdingName(a).localeCompare(holdingName(b))
          : 1;
      if (bValue === null) return -1;
      return bValue - aValue || holdingName(a).localeCompare(holdingName(b));
    });
}
