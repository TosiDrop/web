import { IconMenu2 } from '@tabler/icons-react';
import { ConnectWallet } from '@/components/common/ConnectWallet';
import { useWalletStore } from '@/store/wallet-state';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { truncateHash, getNetworkLabel } from '@/utils/format';

export function TopBar() {
  const { connected, stakeAddress, networkId } = useWalletStore();
  const { open: openMobileMenu } = useMobileMenu();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-surface-base/80 px-4 backdrop-blur-sm lg:px-6">
      <button
        onClick={openMobileMenu}
        className="rounded-md p-1.5 text-slate-400 transition hover:text-white lg:hidden"
        aria-label="Open menu"
      >
        <IconMenu2 size={20} stroke={1.5} />
      </button>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2.5">
        {connected && (
          <span className="text-[11px] text-slate-500">{getNetworkLabel(networkId)}</span>
        )}

        {connected && stakeAddress ? (
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-xs text-slate-400">
              {truncateHash(stakeAddress)}
            </span>
          </div>
        ) : (
          <ConnectWallet />
        )}
      </div>
    </header>
  );
}
