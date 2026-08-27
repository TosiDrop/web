import { IconArrowRight, IconShieldLock, IconSparkles, IconCoin } from '@tabler/icons-react';
import { useOnboardingStore } from '@/store/onboarding-state';
import { GradientButton } from '@/components/common/GradientButton';
import { UmbrellaMark } from '@/components/icons/UmbrellaMark';
import { StepHeading } from './StepHeading';

const highlights = [
  {
    icon: IconCoin,
    label: 'Claim your rewards',
  },
  {
    icon: IconSparkles,
    label: 'See what you are owed',
  },
  {
    icon: IconShieldLock,
    label: 'Your keys stay with you',
  },
];

export function WelcomeStep() {
  const { setStep } = useOnboardingStore();

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cream/20 bg-cream/[0.06]">
        <UmbrellaMark className="h-9 w-9" strokeWidth={3} />
      </div>

      <StepHeading className="mb-2 text-2xl font-semibold tracking-tight text-text-primary">
        Welcome to TosiDrop
      </StepHeading>
      <p className="mb-6 max-w-xs text-sm leading-relaxed text-text-muted">
        Connect your wallet to claim rewards and manage your tokens.
      </p>

      <ul className="mb-8 w-full space-y-2">
        {highlights.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-inset px-3.5 py-2"
          >
            <Icon size={16} className="text-accent" stroke={1.75} aria-hidden />
            <span className="text-xs text-text-secondary">{label}</span>
          </li>
        ))}
      </ul>

      <GradientButton size="md" className="w-full" onClick={() => setStep('select-wallet')}>
        Get started
        <IconArrowRight size={16} aria-hidden />
      </GradientButton>

      <p className="mt-4 text-2xs text-text-muted">Been here before? We'll recognize you.</p>
    </div>
  );
}
