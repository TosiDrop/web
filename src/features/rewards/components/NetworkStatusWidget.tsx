import { useWalletStore } from '@/store/wallet-state';
import { getNetworkLabel } from '@/utils/format';

export function NetworkStatusWidget() {
  const { networkId, connected } = useWalletStore();

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-slate-400">Network</h3>
        {connected ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {getNetworkLabel(networkId)}
          </span>
        ) : (
          <span className="text-xs text-slate-500">Disconnected</span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Rewards are processed automatically each epoch.
      </p>
    </div>
  );
}
