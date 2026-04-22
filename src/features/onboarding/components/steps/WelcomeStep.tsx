import { IconWallet, IconArrowRight } from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';

export function WelcomeStep() {
  const { setStep } = useOnboardingStore();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-teal/20 ring-1 ring-brand-cyan/30">
        <IconWallet size={32} className="text-brand-cyan" stroke={1.5} />
      </div>

      <h2 className="mb-2 text-2xl font-semibold text-white">
        Welcome to Tosi
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-slate-400">
        Connect your Cardano wallet to claim staking rewards, track distributions, and manage your tokens — all in one place.
      </p>

      <button
        onClick={() => setStep('select-wallet')}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3.5 text-sm font-semibold text-surface-base transition-all hover:shadow-lg hover:shadow-brand-cyan/20"
      >
        Get Started
        <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="mt-4 text-xs text-slate-500">
        Already have an account? Your profile will be restored automatically.
      </p>
    </div>
  );
}
