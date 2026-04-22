import { IconArrowRight, IconShieldLock, IconSparkles, IconCoin } from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';

const highlights = [
  {
    icon: IconCoin,
    label: 'Claim staking rewards',
  },
  {
    icon: IconSparkles,
    label: 'Track distributions',
  },
  {
    icon: IconShieldLock,
    label: 'Non-custodial by design',
  },
];

export function WelcomeStep() {
  const { setStep } = useOnboardingStore();

  return (
    <div className="flex flex-col items-center text-center">
      {/* Brand mark */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-teal p-[1.5px] shadow-lg shadow-brand-cyan/20">
        <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-surface-raised">
          <span className="bg-gradient-to-br from-brand-cyan to-brand-teal bg-clip-text text-2xl font-bold text-transparent">
            T
          </span>
        </div>
      </div>

      <h2 className="mb-2 text-2xl font-semibold tracking-tight text-white">
        Welcome to Tosi
      </h2>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-slate-400">
        Sign in with your Cardano wallet to claim rewards and manage your tokens — all in one place.
      </p>

      {/* Trust highlights */}
      <ul className="mb-8 w-full space-y-2">
        {highlights.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-lg border border-border-subtle/60 bg-surface-inset/60 px-3.5 py-2"
          >
            <Icon size={16} className="text-brand-cyan" stroke={1.75} />
            <span className="text-xs text-slate-300">{label}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => setStep('select-wallet')}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-teal px-6 py-3.5 text-sm font-semibold text-surface-base shadow-lg shadow-brand-cyan/20 transition-all hover:shadow-xl hover:shadow-brand-cyan/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
      >
        Get Started
        <IconArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className="mt-4 text-[11px] text-slate-600">
        Already a member? Your profile will be restored automatically.
      </p>
    </div>
  );
}
