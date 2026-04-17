import { useLovelace, useAssets } from '@meshsdk/react';
import { useWalletStore } from '@/store/wallet-state';
import { DonutChart, type DonutSegment } from '@/components/charts/DonutChart';

const MAX_TOKENS = 5;

const PALETTE = ['#3B82F6', '#A855F7', '#F59E0B', '#EC4899', '#10B981', '#22D3EE', '#8B5CF6', '#F97316', '#64748B'];

export function WalletComposition() {
  const { connected } = useWalletStore();
  const lovelace = useLovelace();
  const assets = useAssets();

  if (!connected) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <h3 className="text-xs font-medium text-slate-400">Wallet</h3>
        <p className="mt-3 text-center text-xs text-slate-500">Connect wallet to view</p>
      </div>
    );
  }

  const adaBalance = lovelace ? Number(lovelace) / 1_000_000 : 0;
  const tokenList = assets ?? [];

  const segments: DonutSegment[] = [];

  if (adaBalance > 0) {
    segments.push({ label: 'ADA', value: adaBalance, color: PALETTE[0] });
  }

  const tokenSliceValue = adaBalance > 0 ? adaBalance * 0.1 : 1;
  const visible = tokenList.slice(0, MAX_TOKENS);
  const remaining = tokenList.length - visible.length;

  visible.forEach((token, i) => {
    let ticker = `Token ${i + 1}`;
    if (token.assetName) {
      try {
        if (/^[0-9a-fA-F]+$/.test(token.assetName)) {
          ticker = new TextDecoder().decode(
            new Uint8Array(
              token.assetName.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
            )
          ).slice(0, 8);
        } else {
          ticker = token.assetName.slice(0, 8);
        }
      } catch {
        ticker = token.assetName.slice(0, 8);
      }
    }
    segments.push({
      label: ticker,
      value: tokenSliceValue,
      color: PALETTE[(i + 1) % PALETTE.length],
    });
  });

  if (remaining > 0) {
    segments.push({
      label: `+${remaining} more`,
      value: tokenSliceValue * remaining,
      color: PALETTE[PALETTE.length - 1],
    });
  }

  if (segments.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <h3 className="text-xs font-medium text-slate-400">Wallet</h3>
        <p className="mt-3 text-center text-xs text-slate-500">No assets found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <h3 className="text-xs font-medium text-slate-400">Wallet</h3>
      <div className="mt-3">
        <DonutChart
          segments={segments}
          size={130}
          strokeWidth={16}
          centerLabel={`₳ ${adaBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          centerSub={`${tokenList.length} tokens`}
        />
      </div>
    </div>
  );
}
