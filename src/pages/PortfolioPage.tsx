import { Link } from 'react-router-dom';
import { IconArrowRight, IconGift } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { WalletComposition } from '@/features/rewards/components/WalletComposition';
import { DelegationCard } from '@/features/rewards/components/DelegationCard';
import { useRewards } from '@/features/rewards/api/rewards.queries';
import { useWalletStore } from '@/store/wallet-state';

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
  return (
    <div className="space-y-6">
      <header><p className="label-eyebrow">Your Cardano wallet</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Your portfolio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">A home for your balance, delegation, and rewards. Your wallet is the source of truth for what you own.</p></header>
      <ClaimPrompt />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]"><WalletComposition /><DelegationCard /></div>
    </div>
  );
}
