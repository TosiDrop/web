import { lazy, Suspense, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconArrowRight, IconBookmark, IconChartLine, IconClock, IconGift, IconSettings, IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { CopyButton } from '@/components/common/CopyButton';
import { GradientButton } from '@/components/common/GradientButton';
import { useProfile } from '@/features/profile/api/profile.queries';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';
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
const ProfileForm = lazy(async () => {
  const module = await import('@/features/profile/components/ProfileForm');
  return { default: module.ProfileForm };
});

function SectionLoading({ label }: { label: string }) {
  return <div role="status" aria-label={`Loading ${label}`} className="card-premium h-48 animate-pulse" />;
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof IconWallet;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.1] text-accent-light">
        <Icon size={18} stroke={1.6} aria-hidden />
      </span>
      <div>
        <p className="label-eyebrow">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-text-primary">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">{description}</p>
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
        eyebrow="Account"
        title="Your TosiDrop identity"
        description="The wallet is your sign-in. Keep your display name and network details here."
      />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card as="section" className="p-5">
          <p className="label-eyebrow">Connected wallet</p>
          <p className="mt-2 text-base font-medium text-text-primary">
            {connected ? walletName ?? 'Wallet' : 'Not connected'}
          </p>
          {connected && stakeAddress ? (
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="label-eyebrow">Network</dt>
                <dd className="mt-1.5 font-mono text-xs text-text-secondary">{getNetworkLabel(networkId)}</dd>
              </div>
              <div>
                <dt className="label-eyebrow">Stake address</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-xs text-text-secondary">{truncateHash(stakeAddress, 14, 8)}</span>
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
              Sign a message to update the name shown across TosiDrop.
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
                  <span className="label-eyebrow">Current</span>
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
    <Card className="relative overflow-hidden border-accent/20 bg-[radial-gradient(circle_at_85%_0%,rgba(103,232,249,0.12),transparent_34%),rgba(17,26,47,0.78)] px-6 py-10 sm:px-10 sm:py-14">
      <div className="relative max-w-2xl">
        <p className="label-eyebrow text-accent-light">Your private workspace</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">Connect once. See the whole picture.</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary">
          Your wallet is your sign-in. TosiDrop will use it to show holdings, prices, reward provenance, claim history, and saved assets in this one view.
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

  useEffect(() => {
    if (!location.hash) return undefined;
    const targetId = decodeURIComponent(location.hash.slice(1));
    const frame = requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [connected, location.hash]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Your wallet</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Holdings, claim activity, and saved tokens for your connected wallet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/claim" className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast transition hover:bg-accent-light">
              <IconGift size={13} aria-hidden /> Claim tokens
            </Link>
            <Link to="/analytics" className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent/40 hover:text-text-primary">
              Explore analytics <IconArrowRight size={13} aria-hidden />
            </Link>
            <Link to="/profile#saved-assets" className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent/40 hover:text-text-primary">
              <IconBookmark size={13} aria-hidden /> Saved tokens
            </Link>
          </div>
      </header>

      {connected ? <>
      {rewardTokenCount > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/[0.08] px-4 py-3">
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

      <div className="grid items-start gap-10 xl:grid-cols-2">
        <section id="rewards" aria-labelledby="rewards-title">
          <SectionHeading
            icon={IconChartLine}
            eyebrow="Rewards provenance"
            title="Where your rewards come from"
            description="Trace eligible distributions back to their source pools and reward rules."
          />
          <Suspense fallback={<SectionLoading label="reward sources" />}>
            <RewardBreakdown />
          </Suspense>
        </section>

        <section id="activity" aria-labelledby="activity-title">
          <SectionHeading
            icon={IconClock}
            eyebrow="Activity"
            title="Your claim history"
            description="A chronological record of tokens delivered to this stake address."
          />
          <Suspense fallback={<SectionLoading label="claim history" />}>
            <HistoryList />
          </Suspense>
        </section>
      </div>

      <section id="saved-assets" aria-labelledby="saved-assets-title">
        <SectionHeading
          icon={IconBookmark}
          eyebrow="Saved assets"
          title="Tokens you want close"
          description="Keep favorite assets visible and hide the ones that do not belong in your claim flow."
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
