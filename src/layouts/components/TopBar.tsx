import { Link, useLocation } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { IconMenu2, IconChevronDown, IconLogout, IconUserCircle, IconWallet, IconShieldCheck } from '@tabler/icons-react';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { preloadWalletRuntime } from '@/features/wallet/preload';
import { useMobileMenu } from '@/layouts/useMobileMenu';
import { useProfile } from '@/features/profile/api/profile.queries';
import { getNetworkLabel } from '@/utils/format';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { networkLabel } from '@/shared/network';
import { CopyButton } from '@/components/common/CopyButton';
import { useDelegatedPool } from '@/features/rewards/hooks/useDelegatedPool';
import { truncateHash } from '@/utils/format';
import { pageTitle } from '@/layouts/navigation';

function usePageTitle() {
  const { pathname } = useLocation();
  return pageTitle(pathname);
}

/** Deterministic two-tone identicon so the same address always looks the same. */
function Identicon({ seed }: { seed: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = `var(--color-chart-${(h % 6) + 1})`;
  const b = `var(--color-chart-${((h >> 3) % 6) + 1})`;
  return (
    <span
      aria-hidden
      className="h-5 w-5 shrink-0 rounded-full ring-1 ring-white/10"
      style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }}
    />
  );
}

function AccountMenu({ stakeAddress, networkId, displayName }: { stakeAddress: string; networkId: number | null; displayName?: string }) {
  const disconnect = useWalletStore((s) => s.disconnect);
  const walletName = useWalletStore((s) => s.walletName);
  const accountName = displayName?.trim() || walletName || 'Wallet';
  const { poolId, isLoading: delegationLoading, error: delegationError } = useDelegatedPool(stakeAddress);

  return (
    <Menu>
      <MenuButton
        aria-label="Wallet menu"
        className="group flex h-10 items-center gap-2 rounded-full border border-border-default bg-white/[0.03] pl-2 pr-3 transition hover:bg-white/[0.06] data-[open]:bg-white/[0.06]"
      >
        <Identicon seed={stakeAddress} />
        <span className="max-w-[9rem] truncate text-xs font-medium text-text-secondary group-hover:text-text-primary">
          {accountName}
        </span>
        <IconChevronDown
          size={13}
          stroke={1.8}
          className="text-text-muted transition group-data-[open]:rotate-180"
        />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 8 }}
        transition
        className="z-50 w-[280px] max-w-[calc(100vw-2rem)] origin-top rounded-xl border border-border-subtle bg-surface-overlay/95 p-1 shadow-pop backdrop-blur-md transition duration-150 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-primary">{displayName ?? walletName ?? 'Wallet'}</p>
            <span className="rounded-md border border-border-default px-1.5 py-0.5 text-2xs text-text-muted">
              {getNetworkLabel(networkId)}
            </span>
          </div>
          <div className="mt-1.5 flex items-start gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-2xs leading-relaxed text-text-muted">
              {stakeAddress}
            </p>
            <CopyButton
              value={stakeAddress}
              iconSize={14}
              className="h-8 w-8 shrink-0"
              ariaLabel="Copy stake address"
            />
          </div>
        </div>
        <Link
          to="/team"
          className="mx-2 flex items-center gap-2 rounded-lg bg-surface-inset/60 px-2.5 py-2 transition hover:bg-surface-inset"
        >
          <IconShieldCheck size={14} stroke={1.7} className="shrink-0 text-accent-light" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-2xs uppercase tracking-wider text-text-faint">Current delegation</span>
            <span className="mt-0.5 block truncate font-mono text-2xs text-text-secondary">
              {delegationLoading ? 'Checking…' : delegationError ? 'Temporarily unavailable' : poolId ? truncateHash(poolId, 10, 6) : 'Not delegated'}
            </span>
          </span>
          <span className="shrink-0 text-2xs font-medium text-accent-light">Change</span>
        </Link>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem>
          <Link
            to="/profile"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-text-secondary transition data-[focus]:bg-surface-inset data-[focus]:text-text-primary"
          >
            <IconUserCircle size={14} stroke={1.6} />
            Portfolio
          </Link>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            onClick={disconnect}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-status-error-light transition data-[focus]:bg-status-error/10"
          >
            <IconLogout size={14} stroke={1.6} />
            Disconnect
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

export function TopBar() {
  const { connected, stakeAddress, networkId } = useWalletStore();
  const { data: profile } = useProfile(stakeAddress);
  const openModal = useOnboardingStore((s) => s.openModal);
  const { open: openMobileMenu } = useMobileMenu();
  const title = usePageTitle();

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

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border-subtle bg-surface-inset px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            {networkLabel(DEPLOYMENT_NETWORK)}
          </span>
          {connected && stakeAddress ? (
            <AccountMenu
              stakeAddress={stakeAddress}
              networkId={networkId}
              displayName={profile?.value.name}
            />
          ) : (
            <GradientButton
              variant="secondary"
              className="h-10 rounded-full px-4"
              onClick={openModal}
              onPointerEnter={preloadWalletRuntime}
              onFocus={preloadWalletRuntime}
            >
              <IconWallet size={16} stroke={1.8} />
              Connect wallet
            </GradientButton>
          )}
        </div>
      </div>
    </header>
  );
}
