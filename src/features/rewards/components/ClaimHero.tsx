import { GradientButton } from '@/components/common/GradientButton';
import { UmbrellaMark } from '@/components/icons/UmbrellaMark';
import { QueueCount } from './QueueCount';

interface ClaimHeroProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onClaim: () => void;
  claimDisabled: boolean;
  isPending: boolean;
  canClaim: boolean;
}

export function ClaimHero({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onClaim,
  claimDisabled,
  isPending,
  canClaim,
}: ClaimHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-accent/12 bg-[linear-gradient(135deg,rgba(34,211,238,0.045),rgba(34,211,238,0.02)_52%,rgba(255,255,255,0.012))] px-7 py-7 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_18px_40px_-32px_rgba(8,145,178,0.22)]">
      <UmbrellaMark className="pointer-events-none absolute -right-4 -bottom-9 h-[250px] w-[250px] opacity-[0.06]" />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-light">
              Ready to claim
            </p>
            <QueueCount />
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <span className="text-[52px] font-semibold leading-[0.9] tracking-[-0.03em] tabular-nums text-[#F7F8FB]">
              {selectedCount}
            </span>
            <span className="text-[17px] font-medium text-[#C5C8D2]">
              {selectedCount === 1 ? 'token' : 'tokens'}
            </span>
            <span className="pb-[3px] text-[13px] text-[#8A8E9A]">
              of {totalCount} claimable
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GradientButton variant="secondary" onClick={onToggleAll}>
            {allSelected ? 'Clear' : 'Select all'}
          </GradientButton>
          <GradientButton onClick={onClaim} disabled={claimDisabled}>
            {isPending ? 'Preparing…' : 'Claim all'}
          </GradientButton>
        </div>
      </div>

      {!canClaim && (
        <p className="relative mt-4 text-[12.5px] text-[#8A8E9A]">
          Connect this wallet to claim — you're previewing a stake address.
        </p>
      )}
    </section>
  );
}
