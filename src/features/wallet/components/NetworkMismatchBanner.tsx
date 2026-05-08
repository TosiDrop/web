import { IconAlertTriangle, IconArrowNarrowRight } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { useNetworkStore, networkFromId, networkLabel } from '@/store/network-state';

export function NetworkMismatchBanner() {
  const selectedNetwork = useNetworkStore((s) => s.selectedNetwork);
  const networkId = useWalletStore((s) => s.networkId);
  const walletNetwork = networkFromId(networkId);

  if (!walletNetwork || walletNetwork === selectedNetwork) return null;

  return (
    <div
      role="alert"
      className="relative mb-5 overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/[0.06] via-surface-raised to-surface-raised px-5 py-4"
    >
      <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/12">
            <span className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping opacity-60" />
            <IconAlertTriangle size={16} stroke={1.75} className="relative text-amber-300" />
          </span>
          <div>
            <p className="text-sm font-medium text-white">Wallet network mismatch</p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Switch your wallet, or change the selected network in Profile → Preferences.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[11px] tracking-tight">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
            <span className="h-1 w-1 rounded-full bg-amber-300" />
            wallet · {networkLabel(walletNetwork).toLowerCase()}
          </span>
          <IconArrowNarrowRight size={14} stroke={1.5} className="text-slate-500" />
          <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-cyan/30 bg-brand-cyan/10 px-2 py-1 text-brand-cyan">
            <span className="h-1 w-1 rounded-full bg-brand-cyan" />
            target · {networkLabel(selectedNetwork).toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}
