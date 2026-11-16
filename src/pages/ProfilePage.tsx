import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconBookmark, IconChartLine, IconClock, IconGift, IconSettings, IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { CopyButton } from '@/components/common/CopyButton';
import { GradientButton } from '@/components/common/GradientButton';
import { useProfile } from '@/features/profile/api/profile.queries';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { getNetworkLabel } from '@/utils/format';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { rewardSnapshot } from '@/features/rewards/utils/rewardAlerts';
import { preloadWalletRuntime } from '@/features/wallet/preload';

const HistoryList = lazy(async () => {
  const module = await import('@/features/history/components/HistoryList');
  return { default: module.HistoryList };
});
const FavoritesTab = lazy(async () => {
  const module = await import('@/features/favorites/components/FavoritesTab');
  return { default: module.FavoritesTab };
});
const RewardBreakdown = lazy(async () => {
  const module = await import('@/features/profile/components/RewardBreakdown');
  return { default: module.RewardBreakdown };
});
const PersonalAnalytics = lazy(async () => {
  const module = await import('@/features/profile/components/PersonalAnalytics');
  return { default: module.PersonalAnalytics };
});
const ProfileForm = lazy(async () => {
  const module = await import('@/features/profile/components/ProfileForm');
  return { default: module.ProfileForm };
});

function SectionLoading({ label }: { label: string }) {
  return <div role="status" aria-label={`Loading ${label}`} className="card-premium h-48 animate-pulse" />;
}

function SectionHeading({
  icon: Icon,
  id,
  title,
  description,
}: {
  icon: typeof IconWallet;
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-light">
        <Icon size={18} stroke={1.6} aria-hidden />
      </span>
      <div>
        <h2 id={id} className="text-xl font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">{description}</p>}
      </div>
    </div>
  );
}

function AccountSection() {
  const stakeAddress = useWalletStore((state) => state.stakeAddress);
  const connected = useWalletStore((state) => state.connected);
  const walletName = useWalletStore((state) => state.walletName);
  const networkId = useWalletStore((state) => state.networkId);
  const { data: profile, isLoading, error, refetch } = useProfile(stakeAddress);

  return (
    <section id="account" aria-labelledby="account-title">
      <SectionHeading
        icon={IconSettings}
        id="account-title"
        title="Settings"
        description="Your connected wallet and display name."
      />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card as="section" className="p-5">
          <p className="field-label">Connected wallet</p>
          <p className="mt-2 text-base font-medium text-text-primary">
            {connected ? walletName ?? 'Wallet' : 'Not connected'}
          </p>
          {connected && stakeAddress ? (
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="field-label">Network</dt>
                <dd className="mt-1.5 font-mono text-xs text-text-secondary">{getNetworkLabel(networkId)}</dd>
              </div>
              <div>
                <dt className="field-label">Stake address</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <span className="min-w-0 break-all font-mono text-xs leading-5 text-text-secondary">{stakeAddress}</span>
                  <CopyButton value={stakeAddress} ariaLabel="Copy stake address" />
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-text-muted">Connect a wallet to view account details.</p>
          )}
        </Card>

        <Card as="section" className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Display name</h3>
            <p className="mt-1.5 text-sm text-text-muted">
              Sign a message to update the display name shown across TosiDrop.
            </p>
          </div>
          {isLoading ? (
            <div role="status" aria-label="Loading account profile" className="space-y-3">
              <div className="skeleton-shimmer h-3 w-24 rounded" />
              <div className="skeleton-shimmer h-10 w-full rounded-lg" />
            </div>
          ) : error ? (
            <DataUnavailable
              title="Profile data is unavailable"
              message="Your wallet is connected, but profile data could not be loaded."
              onRetry={() => { void refetch(); }}
            />
          ) : (
            <>
              {profile?.value?.name && (
                <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-inset px-3 py-2">
                  <span className="field-label">Current</span>
                  <span className="text-sm font-medium text-text-primary">{profile.value.name}</span>
                </div>
              )}
              <Suspense fallback={<SectionLoading label="profile form" />}>
                <ProfileForm currentName={profile?.value?.name} />
              </Suspense>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}

function ConnectPortfolioPrompt() {
  const openModal = useOnboardingStore((state) => state.openModal);
  return (
    <Card className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl sm:tracking-tight">Connect your wallet</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
          Connect a wallet to view your holdings, claim history, and saved tokens.
        </p>
        <GradientButton className="mt-6" onClick={openModal} onPointerEnter={preloadWalletRuntime} onFocus={preloadWalletRuntime}>
          <IconWallet size={17} aria-hidden /> Connect wallet
        </GradientButton>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const connected = useWalletStore((state) => state.connected);
  const stakeAddress = useWalletStore((state) => state.stakeAddress);
  const { data: claimableRewards } = useRewards(connected ? stakeAddress : null);
  const rewardTokenCount = claimableRewards ? rewardSnapshot(claimableRewards).length : 0;
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    const aliases: Record<string, string> = { history: 'activity', analytics: 'claim-analytics', favorites: 'saved-assets', settings: 'account' };
    let targetId = tab ? aliases[tab] : null;
    if (location.hash) {
      try { targetId = decodeURIComponent(location.hash.slice(1)); }
      catch { return undefined; }
    }
    if (!targetId) return undefined;
    let frame: number;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scrollToSection);
    });
    function scrollToSection() {
      const target = document.getElementById(targetId!);
      if (!target || !pageRef.current?.contains(target)) return;
      observer.disconnect();
      let ancestor: HTMLElement | null = target;
      while (ancestor && ancestor !== pageRef.current) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
        ancestor = ancestor.parentElement;
      }
      const stakingDetails = targetId === 'staking' ? target.querySelector('details') : null;
      if (stakingDetails) stakingDetails.open = true;
      frame = requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
    if (pageRef.current) observer.observe(pageRef.current, { childList: true, subtree: true });
    frame = requestAnimationFrame(scrollToSection);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [connected, location.hash, location.key, location.search]);

  return (
    <div ref={pageRef} className="space-y-8 [&_section]:scroll-mt-24">
      <header>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Your profile</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Wallet balances, claim history, and saved tokens.
            </p>
          </div>
      </header>

      {connected ? <>
      <nav aria-label="Wallet sections" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border-subtle pb-4 text-sm">
        {[
          ['portfolio-visuals', 'Overview'], ['holdings', 'Holdings'], ['activity', 'History'],
          ['saved-assets', 'Favorites'], ['account', 'Settings'],
        ].map(([id, label]) => (
          <Link key={id} to={`/profile#${id}`} className="inline-flex min-h-10 items-center text-text-secondary hover:text-accent-light hover:underline">{label}</Link>
        ))}
      </nav>
      {rewardTokenCount > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-line bg-accent-soft px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-text-primary">
            <IconGift size={18} stroke={1.7} className="text-accent-light" aria-hidden />
            {rewardTokenCount} reward token{rewardTokenCount === 1 ? '' : 's'} ready to claim
          </p>
          <Link to="/claim" className="text-sm font-medium text-accent-light hover:underline">Review rewards</Link>
        </div>
      )}
      <section id="portfolio-visuals" aria-label="Wallet at a glance">
        <WalletComposition />
      </section>

      <details onToggle={(event) => setInsightsOpen(event.currentTarget.open)} className="border-y border-border-subtle py-4">
        <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">Reward analytics</summary>
      <section id="claim-analytics" aria-labelledby="claim-analytics-title" className="mt-6">
        <SectionHeading icon={IconChartLine} id="claim-analytics-title" title="Reward analytics" description="Delivered claim trends, fee history, and current reward sources." />
        {insightsOpen && <Suspense fallback={<SectionLoading label="claim analytics" />}>
          <PersonalAnalytics />
        </Suspense>}
      </section>

        <section id="rewards" aria-labelledby="rewards-provenance-title" className="mt-8">
          <SectionHeading
            icon={IconChartLine}
            id="rewards-provenance-title"
            title="Current allocations"
            description="Rewards waiting for your next claim, grouped by source."
          />
          {insightsOpen && <Suspense fallback={<SectionLoading label="reward sources" />}>
            <RewardBreakdown />
          </Suspense>}
        </section>
      </details>

        <section id="activity" aria-labelledby="activity-title">
          <SectionHeading
            icon={IconClock}
            id="activity-title"
            title="Claim history"
            description="Tokens delivered to your stake address."
          />
          <Suspense fallback={<SectionLoading label="claim history" />}>
            <HistoryList />
          </Suspense>
        </section>

      <section id="saved-assets" aria-labelledby="saved-assets-title">
        <SectionHeading
          icon={IconBookmark}
          id="saved-assets-title"
          title="Favorites"
        />
        <Suspense fallback={<SectionLoading label="saved assets" />}>
          <FavoritesTab />
        </Suspense>
      </section>

      <AccountSection />
      </> : <ConnectPortfolioPrompt />}
    </div>
  );
}
