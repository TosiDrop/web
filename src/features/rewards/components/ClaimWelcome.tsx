import { IconWallet } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';
import { UmbrellaMark } from '@/components/icons/UmbrellaMark';
import { useOnboardingStore } from '@/store/onboarding-state';

// The claim flow really is a sequence, so the numbers carry information.
const STEPS = [
  ['Connect a wallet, or paste any stake address to preview.'],
  ['Review every claimable token across active distributions.'],
  ['Approve once. Tokens settle straight to your wallet.'],
];

export function ClaimWelcome() {
  const openModal = useOnboardingStore((s) => s.openModal);

  return (
    <Card as="section" className="relative overflow-hidden p-6 sm:p-8">
      <UmbrellaMark
        className="pointer-events-none absolute -right-10 -top-6 hidden h-64 w-64 opacity-[0.07] sm:block"
        strokeWidth={1.6}
      />

      <div className="relative max-w-xl">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-text-primary text-balance">
          Claim what you're owed
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          TosiDrop delivers token rewards to delegators of whitelisted Cardano stake pools.
          Connect a wallet to claim, or paste a stake address above to see what's waiting.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <GradientButton onClick={openModal}>
            <IconWallet size={16} stroke={1.8} />
            Connect wallet
          </GradientButton>
        </div>
      </div>

      <ol className="relative mt-8 max-w-xl divide-y divide-border-subtle border-t border-border-subtle">
        {STEPS.map(([text], i) => (
          <li key={text} className="flex gap-4 py-3 text-sm">
            <span className="w-4 shrink-0 font-mono text-text-faint tabular-nums">{i + 1}</span>
            <span className="text-text-secondary">{text}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
