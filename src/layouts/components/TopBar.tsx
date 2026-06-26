import { useWallet } from '@meshsdk/react';
import { useLocation } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { IconMenu2, IconChevronDown, IconLogout, IconCopy } from '@tabler/icons-react';
import { ConnectWallet } from '@/components/common/ConnectWallet';
import { useWalletStore } from '@/store/wallet-state';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { truncateHash, getNetworkLabel } from '@/utils/format';

const SECTION_LABELS: Record<string, string> = {
  '/': 'Claim',
  '/profile': 'Profile',
  '/team': 'Team',
  '/deposit': 'Deposit',
  '/api-tester': 'API',
};

function useSectionLabel() {
  const { pathname } = useLocation();
  if (pathname === '/') return SECTION_LABELS['/'];
  const match = Object.keys(SECTION_LABELS).find(
    (key) => key !== '/' && pathname.startsWith(key),
  );
  return match ? SECTION_LABELS[match] : 'Overview';
}

function NetworkChip({ networkId }: { networkId: number | null }) {
  return (
    <span className="hidden items-center rounded-[7px] border border-border-default px-2.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#8A8E9A] sm:inline-flex">
      {getNetworkLabel(networkId)}
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
      <MenuButton className="group flex h-9 items-center gap-2 rounded-lg border border-border-default px-3 transition hover:bg-white/[0.04] data-[open]:bg-white/[0.04]">
        <span className="font-mono text-[12px] text-[#C5C8D2] group-hover:text-white">
          {truncateHash(stakeAddress)}
        </span>
        <IconChevronDown
          size={13}
          stroke={1.8}
          className="text-[#6B6F7B] transition group-data-[open]:rotate-180 group-data-[open]:text-accent-light"
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
  const section = useSectionLabel();

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(56,78,128,0.22)] bg-surface-base/70 backdrop-blur-md">
      <div className="flex h-[66px] items-center justify-between px-5 lg:px-9">
        <div className="flex items-center gap-3">
          <button
            onClick={openMobileMenu}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/[0.04] hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu2 size={20} stroke={1.5} />
          </button>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6F7B]">
            Account <span className="text-[#3F424C]">/</span>{' '}
            <span className="text-[#8A8E9A]">{section}</span>
          </p>
        </div>

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
