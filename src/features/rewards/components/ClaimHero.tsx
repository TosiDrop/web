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
    <section className="relative overflow-hidden rounded-[18px] border border-accent/20 bg-[linear-gradient(135deg,rgba(99,102,241,0.16),rgba(99,102,241,0.04)_52%,rgba(255,255,255,0.02))] px-7 py-7 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_24px_50px_-28px_rgba(60,60,160,0.5)]">
      <UmbrellaMark className="pointer-events-none absolute -right-4 -bottom-9 h-[250px] w-[250px] opacity-[0.07]" />

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
          <button
            type="button"
            onClick={onToggleAll}
            className="rounded-[11px] border border-white/[0.14] bg-white/[0.04] px-5 py-3 text-[14px] font-medium text-[#D7D9E0] transition hover:bg-white/[0.07] hover:text-white"
          >
            {allSelected ? 'Clear' : 'Select all'}
          </button>
          <button
            type="button"
            onClick={onClaim}
            disabled={claimDisabled}
            className="rounded-[11px] bg-[linear-gradient(180deg,#6F72F5,#5A5DE8)] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(99,102,241,0.8)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {isPending ? 'Preparing…' : 'Claim all'}
          </button>
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
