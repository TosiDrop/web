import { Link, Navigate } from 'react-router-dom';
import { IconArrowRight, IconWallet } from '@tabler/icons-react';
import { GradientButton } from '@/components/common/GradientButton';
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

export default function HomePage() {
  const connected = useWalletStore((state) => state.connected);
  if (!connected) return <PublicHome />;
  return <Navigate to="/profile" replace />;
}
