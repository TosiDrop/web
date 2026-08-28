import { IconAlertTriangle, IconArrowRight } from '@tabler/icons-react';
import { useWalletStore } from '@/store/wallet-state';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { networkFromId, networkLabel } from '@/shared/network';

export function NetworkMismatchBanner() {
  const networkId = useWalletStore((s) => s.networkId);
  const walletNetwork = networkFromId(networkId);

  if (!walletNetwork || walletNetwork === DEPLOYMENT_NETWORK) return null;

  return (
    <div role="alert" className="card-premium mb-6 flex flex-wrap items-center gap-4 px-5 py-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-status-pending/[0.12]">
        <IconAlertTriangle size={19} stroke={1.8} className="text-status-pending-light" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">Wrong network</p>
        <p className="mt-0.5 text-md text-text-muted">
          Your wallet is on {networkLabel(walletNetwork)}. Switch it to{' '}
          {networkLabel(DEPLOYMENT_NETWORK)} to claim here.
        </p>
      </div>
      <div className="flex items-center gap-2.5 font-mono text-2xs sm:ml-auto">
        <span className="rounded-lg border border-status-pending/20 bg-status-pending/[0.08] px-2.5 py-1.5 text-status-pending-light">
          {networkLabel(walletNetwork)}
        </span>
        <IconArrowRight size={14} stroke={1.7} className="text-text-faint" />
        <span className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-accent-light">
          {networkLabel(DEPLOYMENT_NETWORK)}
        </span>
      </div>
    </div>
  );
}
