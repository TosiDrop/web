import { IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';
import { UmbrellaMark } from '@/components/icons/UmbrellaMark';
import { useOnboardingStore } from '@/store/onboarding-state';

const STEPS = [
  {
    n: 1,
    title: 'Connect or paste',
    desc: 'Link a wallet, or paste any stake address to preview without connecting.',
  },
  {
    n: 2,
    title: 'Review rewards',
    desc: 'See every claimable token across all active distributions.',
  },
  {
    n: 3,
    title: 'Claim to wallet',
    desc: 'Approve once and your tokens settle straight to your wallet.',
  },
];

export function ClaimWelcome() {
  const openModal = useOnboardingStore((s) => s.openModal);

  return (
    <Card as="section" className="px-8 py-12">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-cream/20 bg-cream/[0.06]">
          <UmbrellaMark className="h-9 w-9" strokeWidth={3} />
        </div>

        <p className="label-eyebrow text-cream">Cardano token rewards</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-text-primary">
          Claim what you're owed
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
          Connect your wallet or paste a stake address to see every token waiting for you across
          TosiDrop distributions.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <GradientButton onClick={openModal}>
            <IconWallet size={16} stroke={1.8} />
            Connect wallet
          </GradientButton>
          <span className="text-md text-text-muted">or paste a stake address above</span>
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.n} variant="inset" className="p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cream/[0.1] text-md font-semibold text-cream">
              {s.n}
            </div>
            <p className="mt-4 text-sm font-semibold text-text-primary">{s.title}</p>
            <p className="mt-1 text-md leading-relaxed text-text-muted">{s.desc}</p>
          </Card>
        ))}
      </div>
    </Card>
  );
}
