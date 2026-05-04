import { useWallet } from '@meshsdk/react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { IconMenu2, IconChevronDown, IconLogout, IconCopy } from '@tabler/icons-react';
import { ConnectWallet } from '@/components/common/ConnectWallet';
import { useWalletStore } from '@/store/wallet-state';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { truncateHash, getNetworkLabel } from '@/utils/format';

function NetworkChip({ networkId }: { networkId: number | null }) {
  const isMainnet = networkId === 1;
  const label = getNetworkLabel(networkId);
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-border-subtle bg-surface-raised/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400 sm:inline-flex">
      <span
        className={
          'h-1 w-1 rounded-full ' +
          (isMainnet
            ? 'bg-brand-cyan shadow-[0_0_5px_rgba(34,211,238,0.85)]'
            : 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.7)]')
        }
      />
      {label}
    </span>
  );
}

function WalletMenu({ stakeAddress }: { stakeAddress: string }) {
  const { disconnect } = useWallet();

  const handleCopy = () => {
    navigator.clipboard.writeText(stakeAddress);
  };

  return (
    <Menu>
      <MenuButton className="group flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-raised/60 px-3 py-1.5 transition hover:border-brand-cyan/30 hover:bg-surface-raised data-[open]:border-brand-cyan/40 data-[open]:bg-surface-raised">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.85)]" />
        </span>
        <span className="font-mono text-xs text-slate-300 group-hover:text-white">
          {truncateHash(stakeAddress)}
        </span>
        <IconChevronDown
          size={12}
          stroke={1.6}
          className="text-slate-500 transition group-data-[open]:rotate-180 group-data-[open]:text-brand-cyan"
        />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 8 }}
        transition
        className="z-50 w-[260px] rounded-xl border border-border-subtle bg-surface-overlay/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-md focus:outline-none origin-top transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <div className="px-3 py-2.5">
          <p className="label-eyebrow">Stake address</p>
          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-slate-300">
            {stakeAddress}
          </p>
        </div>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem>
          <button
            onClick={handleCopy}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-slate-300 transition data-[focus]:bg-surface-inset data-[focus]:text-white"
          >
            <IconCopy size={14} stroke={1.6} />
            Copy address
          </button>
        </MenuItem>
        <MenuItem>
          <button
            onClick={disconnect}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-rose-300 transition data-[focus]:bg-rose-500/10 data-[focus]:text-rose-200"
          >
            <IconLogout size={14} stroke={1.6} />
            Disconnect wallet
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

export function TopBar() {
  const { connected, stakeAddress, networkId } = useWalletStore();
  const { open: openMobileMenu } = useMobileMenu();

  return (
    <header className="sticky top-0 z-30 bg-surface-base/70 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <button
          onClick={openMobileMenu}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-surface-raised/50 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <IconMenu2 size={20} stroke={1.5} />
        </button>
        <div className="hidden lg:block" />

        <div className="flex items-center gap-2.5">
          {connected && <NetworkChip networkId={networkId} />}
          {connected && stakeAddress ? (
            <WalletMenu stakeAddress={stakeAddress} />
          ) : (
            <ConnectWallet />
          )}
        </div>
      </div>
    </header>
  );
}
