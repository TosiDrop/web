import { useLocation } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { IconMenu2, IconChevronDown, IconLogout, IconCopy } from '@tabler/icons-react';
import { ConnectWallet } from '@/components/common/ConnectWallet';
import { useWalletStore } from '@/store/wallet-state';
import { useClaimStore } from '@/store/claim-state';
import { useMobileMenu } from '@/layouts/MobileMenuContext';
import { toast } from '@/store/toast-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Claim',
  '/profile': 'Profile',
  '/team': 'Team',
  '/deposit': 'Deposit',
};

function usePageTitle() {
  const { pathname } = useLocation();
  if (pathname === '/') return PAGE_TITLES['/'];
  const match = Object.keys(PAGE_TITLES).find((k) => k !== '/' && pathname.startsWith(k));
  return match ? PAGE_TITLES[match] : '';
}

function NetworkChip({ networkId }: { networkId: number | null }) {
  return (
    <span className="hidden h-9 items-center rounded-lg border border-border-default px-2.5 font-mono text-2xs uppercase tracking-[0.1em] text-text-muted sm:inline-flex">
      {getNetworkLabel(networkId)}
    </span>
  );
}

function WalletMenu({ stakeAddress }: { stakeAddress: string }) {
  const disconnect = useWalletStore((s) => s.disconnect);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stakeAddress);
      toast.success('Stake address copied');
    } catch {
      toast.error('Could not copy — select the address and copy it manually.');
    }
  };

  return (
    <Menu>
      <MenuButton className="group flex h-9 items-center gap-2 rounded-lg border border-border-default px-3 transition hover:bg-white/[0.04] data-[open]:bg-white/[0.04]">
        <span className="font-mono text-xs text-text-secondary group-hover:text-text-primary">
          {truncateHash(stakeAddress)}
        </span>
        <IconChevronDown
          size={13}
          stroke={1.8}
          className="text-text-muted transition group-data-[open]:rotate-180 group-data-[open]:text-accent-light"
        />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 8 }}
        transition
        className="z-50 w-[260px] max-w-[calc(100vw-2rem)] origin-top rounded-xl border border-border-subtle bg-surface-overlay/95 p-1 shadow-pop backdrop-blur-md transition duration-150 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <div className="px-3 py-2.5">
          <p className="label-eyebrow">Stake address</p>
          <p className="mt-1 break-all font-mono text-2xs leading-relaxed text-text-secondary">
            {stakeAddress}
          </p>
        </div>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem>
          <button
            type="button"
            onClick={copy}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-text-secondary transition data-[focus]:bg-surface-inset data-[focus]:text-text-primary"
          >
            <IconCopy size={14} stroke={1.6} />
            Copy address
          </button>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            onClick={disconnect}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-status-error-light transition data-[focus]:bg-status-error/10"
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
  const lookupAddress = useClaimStore((s) => s.lookupAddress);
  const { open: openMobileMenu } = useMobileMenu();
  const { pathname } = useLocation();
  const title = usePageTitle();

  // On the claim landing the hero owns the connect call-to-action.
  const heroOwnsCta = pathname === '/' && !connected && !lookupAddress;

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface-base/70 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-9">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openMobileMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition hover:bg-white/[0.04] hover:text-text-primary lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu2 size={20} stroke={1.5} />
          </button>
          <p className="text-sm font-medium text-text-muted">{title}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {connected && <NetworkChip networkId={networkId} />}
          {connected && stakeAddress ? (
            <WalletMenu stakeAddress={stakeAddress} />
          ) : (
            !heroOwnsCta && <ConnectWallet />
          )}
        </div>
      </div>
    </header>
  );
}
