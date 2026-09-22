import { Link } from 'react-router-dom';
import { IconArrowRight, IconGift, IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { preloadWalletRuntime } from '@/features/wallet/preload';

function PublicHome() {
  const openModal = useOnboardingStore((state) => state.openModal);

  return (
    <div className="space-y-10">
      <section className="card-premium relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="label-eyebrow">Cardano token distribution</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl">
            Claim the tokens you earned.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary">
            TosiDrop connects Cardano delegators with token rewards from community projects and dApps. Connect your wallet to see what is waiting for you.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <GradientButton onClick={openModal} onPointerEnter={preloadWalletRuntime} onFocus={preloadWalletRuntime}>
              <IconWallet size={17} /> Connect wallet
            </GradientButton>
            <Link to="/claim" className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-default px-4 text-sm font-medium text-text-secondary transition hover:border-accent/50 hover:text-text-primary">
              See how claiming works <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="card-premium px-6 py-6 sm:px-8">
        <div><p className="label-eyebrow">For delegators</p><h2 id="how-it-works" className="mt-2 text-xl font-semibold text-text-primary">How claiming works</h2></div>
        <ol className="mt-6 grid gap-5 border-t border-border-subtle pt-5 md:grid-cols-3">
          {[['01', 'Connect your wallet', 'We read your stake address and current delegation.'], ['02', 'Review your rewards', 'See each eligible token and choose what to claim.'], ['03', 'Approve once', 'Send the displayed reward deposit plus any processing or overhead fee, then TosiDrop releases your rewards.']].map(([number, title, text]) => (
            <li key={number} className="flex gap-3"><span className="font-mono text-xs text-accent-light">{number}</span><div><h3 className="text-sm font-medium text-text-primary">{title}</h3><p className="mt-1 text-xs leading-5 text-text-muted">{text}</p></div></li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function ClaimPrompt() {
  const stakeAddress = useWalletStore((state) => state.stakeAddress);
  const connected = useWalletStore((state) => state.connected);
  const { data: rewards, isLoading, error } = useRewards(stakeAddress);

  if (!connected || !stakeAddress) {
    return (
      <Card className="border-cream/20 bg-cream/[0.06] p-5">
        <p className="label-eyebrow">Next step</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="text-lg font-semibold text-text-primary">Connect to check your rewards</h2><p className="mt-1 text-sm text-text-muted">Your home will show claimable distributions as soon as your wallet is connected.</p></div>
          <Link to="/claim" className="inline-flex items-center gap-2 text-sm font-medium text-accent-light">Open claim flow <IconArrowRight size={16} /></Link>
        </div>
      </Card>
    );
  }

  if (isLoading) return <Card className="h-28 animate-pulse" aria-label="Checking claimable rewards" />;
  if (error) return <Card className="p-5"><p className="text-sm text-status-error-light">Claimable rewards are temporarily unavailable.</p><Link to="/claim" className="mt-2 inline-flex items-center gap-2 text-xs text-accent-light">Try the claim flow <IconArrowRight size={14} /></Link></Card>;

  const count = rewards?.length ?? 0;
  return (
    <Card className={`overflow-hidden ${count > 0 ? 'border-accent/40 bg-accent/[0.06]' : ''}`}>
      <div className="flex flex-wrap items-end justify-between gap-6 p-6 sm:p-7">
        <div>
          <div className="flex items-center gap-2 text-accent-light">
            <IconGift size={16} aria-hidden />
            <p className="label-eyebrow text-accent-light">Rewards pulse</p>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            {count > 0 ? `${count} reward${count === 1 ? '' : 's'} ready` : 'You’re all caught up'}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-text-muted">
            {count > 0 ? 'Review your eligible distributions and choose what to claim.' : 'New distributions appear here as soon as they become available.'}
          </p>
        </div>
        <Link to="/claim" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-contrast transition hover:bg-accent-light">
          {count > 0 ? 'Review rewards' : 'Open claim flow'} <IconArrowRight size={16} />
        </Link>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const connected = useWalletStore((state) => state.connected);
  if (!connected) return <PublicHome />;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label-eyebrow">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Your wallet at a glance</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-text-muted">Balance, rewards, and portfolio context in one place. Your wallet is the source of truth for what you own.</p>
        </div>
        <Link to="/claim" className="hidden items-center gap-2 text-sm font-medium text-accent-light transition hover:text-text-primary sm:inline-flex">
          Claim rewards <IconArrowRight size={16} />
        </Link>
      </header>
      <ClaimPrompt />
      <section aria-labelledby="wallet-overview" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="label-eyebrow">Live wallet data</p>
            <h2 id="wallet-overview" className="mt-1 text-xl font-semibold tracking-tight text-text-primary">Your portfolio</h2>
          </div>
        </div>
        <WalletComposition compact />
      </section>
    </div>
  );
}
