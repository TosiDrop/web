import { Card } from '@/components/common/Card';
import { useWalletStore } from '@/store/wallet-state';
import { getNetworkLabel } from '@/utils/format';

export function NetworkStatusWidget() {
  const networkId = useWalletStore((s) => s.networkId);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">Network</h3>
        <span className="rounded-full border border-border-subtle bg-surface-inset px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-text-secondary">
          {getNetworkLabel(networkId)}
        </span>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-text-muted">
        Rewards are processed automatically each epoch.
      </p>
    </Card>
  );
}
