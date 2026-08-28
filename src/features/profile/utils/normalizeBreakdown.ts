import { tickerFor, decimalsFor, type TokenMap } from '@/features/history/api/history.queries';

export interface BreakdownEntry {
  token: string;
  ticker: string;
  logo?: string;
  amount: number;
  epoch: number | null;
  pool: string | null;
  rule: string | null;
  kind: 'reward' | 'promise';
}

interface RawBreakdown {
  rewards?: unknown[];
  promises?: unknown[];
}

function firstString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

function firstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

// The VM API types this payload as any[]; probe common field spellings and
// drop anything we cannot interpret so one malformed row never blanks the tab.
export function normalizeBreakdown(
  raw: RawBreakdown | null | undefined,
  tokenMap: TokenMap,
): BreakdownEntry[] {
  const out: BreakdownEntry[] = [];

  const push = (rows: unknown[] | undefined, kind: 'reward' | 'promise') => {
    if (!Array.isArray(rows)) return;
    for (const r of rows) {
      if (!r || typeof r !== 'object') continue;
      const row = r as Record<string, unknown>;
      const token = firstString(row, ['token', 'token_id', 'asset', 'asset_id']);
      const amountRaw = firstValue(row, ['amount', 'quantity']);
      if (!token || amountRaw === undefined) continue;
      const amountNum = Number(amountRaw);
      if (Number.isNaN(amountNum)) continue;

      const info = tokenMap[token];
      const decimals = decimalsFor(token, info);
      const epochRaw = firstValue(row, ['epoch']);
      const epochNum = Number(epochRaw);

      out.push({
        token,
        ticker: tickerFor(token, info),
        logo: info?.logo,
        amount: amountNum / Math.pow(10, decimals),
        epoch: epochRaw !== undefined && !Number.isNaN(epochNum) ? epochNum : null,
        pool: firstString(row, ['pool', 'pool_id', 'pool_ticker']),
        rule: firstString(row, ['rule', 'source', 'distribution', 'reason']),
        kind,
      });
    }
  };

  push(raw?.rewards, 'reward');
  push(raw?.promises, 'promise');
  return out;
}
