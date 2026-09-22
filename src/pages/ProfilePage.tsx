import { lazy, Suspense, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconArrowRight, IconBookmark, IconChartLine, IconClock, IconSettings, IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { CopyButton } from '@/components/common/CopyButton';
import { GradientButton } from '@/components/common/GradientButton';
import { useProfile } from '@/features/profile/api/profile.queries';
import { DataUnavailable } from '@/components/common/DataUnavailable';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { truncateHash, getNetworkLabel } from '@/utils/format';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';
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
    <div className="space-y-12">
      <header className="relative overflow-hidden rounded-3xl border border-border-default bg-[radial-gradient(circle_at_85%_0%,rgba(103,232,249,0.14),transparent_32%),linear-gradient(135deg,rgba(27,39,67,0.8),rgba(16,23,40,0.92))] px-6 py-8 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label-eyebrow text-accent-light">Portfolio workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Everything you own, earned, and saved.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
              One connected view of your holdings, balance history, rewards, activity, and preferences. Use Analytics when you want the wider network context.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link to="/analytics" className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent/40 hover:text-text-primary">
              Explore analytics <IconArrowRight size={13} aria-hidden />
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-1.5 text-xs text-accent-light">
              <IconChartLine size={15} stroke={1.7} aria-hidden />
              {connected ? 'Live wallet context' : 'Connect to personalize'}
            </div>
          </div>
        </div>
        {connected && <nav aria-label="Portfolio sections" className="relative mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.08] pt-4 text-xs text-text-muted">
          {[
            ['portfolio-visuals', 'Portfolio'],
            ['rewards', 'Rewards'],
            ['activity', 'Activity'],
            ['saved-assets', 'Saved assets'],
            ['account', 'Account'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="transition hover:text-text-primary">{label}</a>
          ))}
        </nav>}
      </header>

      {connected ? <>
      <section id="portfolio-visuals" aria-labelledby="portfolio-title">
        <SectionHeading
          icon={IconWallet}
          eyebrow="Portfolio"
          title="Your holdings in motion"
          description="Balance history, allocation, cached prices, and the assets behind your portfolio value."
        />
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
