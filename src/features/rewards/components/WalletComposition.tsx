import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/common/Card';
import { apiClient } from '@/api/client';
import { useWalletStore } from '@/store/wallet-state';

interface WalletHolding {
  unit: string;
  quantity: string;
  name: string | null;
  ticker: string | null;
  decimals: number | null;
  metadataPending: boolean;
}

interface WalletSummary {
  balance: { lovelace: string };
  holdings: WalletHolding[];
  metadata: { complete: boolean; returned: number; total: number };
}

function formatQuantity(quantity: string, decimals: number | null): string {
  if (decimals === null) return quantity;
  const value = Number(quantity) / 10 ** decimals;
  if (!Number.isFinite(value)) return quantity;
  return value.toLocaleString(undefined, { maximumFractionDigits: Math.min(decimals, 6) });
}

function shortName(holding: WalletHolding): string {
  return holding.ticker || holding.name || holding.unit.slice(0, 12);
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-text-secondary">Wallet balance</h3>
      {children}
    </Card>
  );
}

export function WalletComposition() {
  const { connected, stakeAddress } = useWalletStore();
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet-summary', stakeAddress],
    queryFn: () =>
      apiClient.get<WalletSummary>(
        `/api/wallet/summary?staking_address=${encodeURIComponent(stakeAddress!)}`,
      ),
    enabled: connected && !!stakeAddress,
    staleTime: 60_000,
  });

  if (!connected || !stakeAddress) {
    return <Panel><p className="mt-3 text-xs text-text-muted">Not connected</p></Panel>;
  }

  if (isLoading) {
    return <Panel><p className="mt-3 text-xs text-text-muted">Loading wallet balance…</p></Panel>;
  }

  if (error || !data) {
    return <Panel><p className="mt-3 text-xs text-status-error-light">Couldn&apos;t load wallet balance.</p></Panel>;
  }

  const adaBalance = Number(data.balance.lovelace) / 1_000_000;
  const visibleHoldings = data.holdings.slice(0, 5);
  const remaining = data.holdings.length - visibleHoldings.length;

  return (
    <Panel>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-text-primary">
          ₳ {adaBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className="text-xs text-text-muted">
          {data.holdings.length} {data.holdings.length === 1 ? 'native asset' : 'native assets'}
        </span>
      </div>

      <div className="mt-5 space-y-2 border-t border-border-subtle pt-4">
        {visibleHoldings.map((holding) => (
          <div key={holding.unit} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-inset font-mono text-2xs uppercase text-text-secondary">
              {shortName(holding).slice(0, 3)}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">
              {shortName(holding)}
              {holding.metadataPending && <span className="ml-1 text-2xs text-text-faint">pending metadata</span>}
            </span>
            <span className="font-mono text-xs tabular-nums text-text-muted">
              {formatQuantity(holding.quantity, holding.decimals)}
            </span>
          </div>
        ))}
        {remaining > 0 && <p className="pt-1 text-xs text-text-muted">+{remaining} more assets</p>}
      </div>

      {!data.metadata.complete && (
        <p className="mt-4 text-2xs leading-5 text-text-faint">
          Some asset metadata is still being indexed. Quantities remain sourced from the wallet.
        </p>
      )}
    </Panel>
  );
}
