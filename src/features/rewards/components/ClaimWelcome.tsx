import { IconWallet } from '@tabler/icons-react';
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
    <section className="relative overflow-hidden rounded-2xl border border-border-subtle bg-[linear-gradient(180deg,#161B2E,#11141F)] px-8 py-12 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_24px_50px_-34px_rgba(0,0,0,0.8)]">
      {/* soft ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full bg-accent/[0.07] blur-3xl"
      />

      <div className="relative flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.06] shadow-[0_8px_24px_-12px_rgba(34,211,238,0.4)]">
          <UmbrellaMark className="h-9 w-9" stroke="#67E8F9" strokeWidth={3.4} />
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-light">
          Cardano token rewards
        </p>
        <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-[#F4F5F7]">
          Claim what you're owed
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[#9AA0AE]">
          Connect your wallet or paste a stake address to see every token waiting for you across
          TosiDrop distributions.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <GradientButton onClick={openModal}>
            <IconWallet size={16} stroke={1.8} />
            Connect wallet
          </GradientButton>
          <span className="text-[13px] text-[#6B7290]">or paste a stake address above</span>
        </div>
      </div>

      {/* How it works — 1·2·3 */}
      <div className="relative mt-10 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-border-subtle bg-white/[0.02] p-5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/[0.12] text-[13px] font-semibold text-accent-light">
              {s.n}
            </div>
            <p className="mt-3.5 text-[14px] font-semibold text-[#E7E9EF]">{s.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#7A8094]">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
