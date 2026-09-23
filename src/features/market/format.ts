export function formatMarketPrice(value: number | null | undefined, currency: 'USD' | 'ADA'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (currency === 'ADA') {
    return `₳ ${value < 0.0001 ? value.toPrecision(3) : value.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  }
  return value < 0.01
    ? `$${value.toPrecision(3)}`
    : value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 4 });
}

export function formatEstimatedUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value < 0.01
    ? `$${value.toPrecision(3)}`
    : value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function formatEstimatedAda(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `₳ ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
