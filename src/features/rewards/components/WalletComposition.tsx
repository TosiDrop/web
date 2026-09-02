import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/common/Card';
import { useWalletStore } from '@/store/wallet-state';

const MAX_TOKENS = 5;
const HEX_PAIR_RE = /^(?:[0-9a-fA-F]{2})+$/;
const CHART_COLORS = 6;
const decoder = new TextDecoder();

function chartColor(i: number): string {
  return `var(--color-chart-${(i % CHART_COLORS) + 1})`;
}

function decodeAssetName(assetName: string): string {
  if (!HEX_PAIR_RE.test(assetName)) return assetName.slice(0, 8);
  const pairs = assetName.match(/.{2}/g)!;
  return decoder.decode(new Uint8Array(pairs.map((b) => parseInt(b, 16)))).slice(0, 8);
}

interface Part {
  label: string;
  value: number;
  color: string;
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-text-secondary">Wallet composition</h3>
      {children}
    </Card>
  );
}

export function WalletComposition() {
  const { connected, wallet, stakeAddress } = useWalletStore();
  const { data } = useQuery({
    queryKey: ['wallet-composition', stakeAddress],
    queryFn: async () => {
      const [lovelace, assets] = await Promise.all([wallet!.getLovelace(), wallet!.getAssets()]);
      return { lovelace, assets };
    },
    enabled: connected && !!wallet,
    staleTime: 60_000,
  });
  const lovelace = data?.lovelace;
  const assets = data?.assets;

  const adaBalance = lovelace ? Number(lovelace) / 1_000_000 : 0;
  const tokenList = useMemo(() => assets ?? [], [assets]);

  const { parts, total, totalTokens } = useMemo(() => {
    const result: Part[] = [];
    if (adaBalance > 0) {
      result.push({ label: 'ADA', value: adaBalance, color: chartColor(0) });
    }
    const tokenSliceValue = adaBalance > 0 ? adaBalance * 0.1 : 1;
    const visible = tokenList.slice(0, MAX_TOKENS);
    const remaining = tokenList.length - visible.length;

    visible.forEach((token, i) => {
      const ticker = token.assetName ? decodeAssetName(token.assetName) : `Token ${i + 1}`;
      result.push({ label: ticker, value: tokenSliceValue, color: chartColor(i + 1) });
    });

    if (remaining > 0) {
      result.push({
        label: `+${remaining} more`,
        value: tokenSliceValue,
        color: chartColor(CHART_COLORS - 1),
      });
    }

    const sum = result.reduce((acc, p) => acc + p.value, 0) || 1;
    return { parts: result, total: sum, totalTokens: tokenList.length };
  }, [adaBalance, tokenList]);

  if (!connected) {
    return (
      <Panel>
        <p className="mt-3 text-xs text-text-muted">Not connected</p>
      </Panel>
    );
  }

  if (parts.length === 0) {
    return (
      <Panel>
        <p className="mt-3 text-xs text-text-muted">No assets found</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-text-primary">
          ₳ {adaBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        <span className="text-xs text-text-muted">
          {totalTokens} {totalTokens === 1 ? 'asset' : 'assets'}
        </span>
      </div>

      <div className="my-4 flex h-2 gap-0.5 overflow-hidden rounded-md">
        {parts.map((p) => (
          <div
            key={p.label}
            style={{ width: `${(p.value / total) * 100}%`, backgroundColor: p.color }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="min-w-0 flex-1 truncate text-md text-text-secondary">{p.label}</span>
            <span className="font-mono text-2xs tabular-nums text-text-muted">
              {Math.round((p.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
