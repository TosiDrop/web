import { Link } from 'react-router-dom';
import { IconArrowRight, IconGift, IconRocket, IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';
import { DelegationCard } from '@/features/rewards/components/DelegationCard';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useWalletStore } from '@/store/wallet-state';
import { useOnboardingStore } from '@/store/onboarding-state';
import { preloadWalletRuntime } from '@/features/wallet/preload';

function PublicLanding() {
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
            TosiDrop connects Cardano delegators with token rewards from community projects and dApps. Connect your wallet to see what is waiting for you, or explore how to distribute tokens to your own community.
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

      <section aria-labelledby="audiences" className="space-y-4">
        <div><p className="label-eyebrow">Choose your path</p><h2 id="audiences" className="mt-2 text-2xl font-semibold tracking-tight text-text-primary">A home for Cardano rewards</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Whether you are here to receive tokens or distribute them, TosiDrop gives you a clear next step.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-6 transition hover:border-accent/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent-light"><IconWallet size={20} /></span>
            <h3 className="mt-5 text-lg font-semibold text-text-primary">I am a Cardano delegator</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">Connect your wallet to check your claimable tokens, see your current stake pool, and claim rewards in a few guided steps.</p>
            <button type="button" onClick={openModal} onPointerEnter={preloadWalletRuntime} onFocus={preloadWalletRuntime} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-light transition hover:text-white">Check my rewards <IconArrowRight size={16} /></button>
          </Card>
          <Card className="p-6 transition hover:border-cream/40">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream/10 text-cream"><IconRocket size={20} /></span>
            <h3 className="mt-5 text-lg font-semibold text-text-primary">I run a token project or dApp</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">Bring your distribution to Cardano users. Set up a project, define eligibility, and make your token program discoverable.</p>
            <Link to="/projects/new" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cream-light transition hover:text-white">Start a distribution <IconArrowRight size={16} /></Link>
          </Card>
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="card-premium px-6 py-6 sm:px-8">
        <div><p className="label-eyebrow">For delegators</p><h2 id="how-it-works" className="mt-2 text-xl font-semibold text-text-primary">How claiming works</h2></div>
        <ol className="mt-6 grid gap-5 border-t border-border-subtle pt-5 md:grid-cols-3">
          {[['01', 'Connect your wallet', 'We read your stake address and current delegation.'], ['02', 'Review your rewards', 'See each eligible token and choose what to claim.'], ['03', 'Approve once', 'Your wallet signs the claim and tokens settle to you.']].map(([number, title, text]) => (
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
          <div><h2 className="text-lg font-semibold text-text-primary">Connect to check your rewards</h2><p className="mt-1 text-sm text-text-muted">Your portfolio will show claimable distributions as soon as your wallet is connected.</p></div>
          <Link to="/claim" className="inline-flex items-center gap-2 text-sm font-medium text-accent-light">Open claim flow <IconArrowRight size={16} /></Link>
        </div>
      </Card>
    );
  }

  if (isLoading) return <Card className="h-28 animate-pulse" aria-label="Checking claimable rewards" />;
  if (error) return <Card className="p-5"><p className="text-sm text-status-error-light">Claimable rewards are temporarily unavailable.</p><Link to="/claim" className="mt-2 inline-flex items-center gap-2 text-xs text-accent-light">Try the claim flow <IconArrowRight size={14} /></Link></Card>;

  const count = rewards?.length ?? 0;
  return (
    <Card className={`p-5 ${count > 0 ? 'border-accent/40 bg-accent/[0.06]' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent-light"><IconGift size={18} /></span>
          <div><p className="label-eyebrow">Claim check</p><h2 className="mt-1 text-lg font-semibold text-text-primary">{count > 0 ? `You have ${count} token${count === 1 ? '' : 's'} to claim` : 'You’re all caught up'}</h2><p className="mt-1 text-sm text-text-muted">{count > 0 ? 'Review the distribution and choose what to receive.' : 'We’ll check again when new distributions arrive.'}</p></div>
        </div>
        <Link to="/claim" className="inline-flex items-center gap-2 text-sm font-medium text-accent-light transition hover:text-white">{count > 0 ? 'Review rewards' : 'Open claim flow'} <IconArrowRight size={16} /></Link>
      </div>
    </Card>
  );
}

export default function PortfolioPage() {
  const connected = useWalletStore((state) => state.connected);
  if (!connected) return <PublicLanding />;

  return (
    <div className="space-y-6">
      <header><p className="label-eyebrow">Your Cardano wallet</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Your portfolio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">A home for your balance, delegation, and rewards. Your wallet is the source of truth for what you own.</p></header>
      <ClaimPrompt />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]"><WalletComposition /><DelegationCard /></div>
    </div>
  );
}
