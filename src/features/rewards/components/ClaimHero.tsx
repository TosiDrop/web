import { Card } from '@/components/common/Card';
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
  const noun = selectedCount === 1 ? 'token' : 'tokens';

  return (
    <Card as="section" className="relative overflow-hidden p-6">
      <UmbrellaMark className="pointer-events-none absolute -right-4 -bottom-9 h-60 w-60 opacity-[0.06]" />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="label-eyebrow">Ready to claim</p>
            <QueueCount />
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-5xl font-semibold leading-none tracking-tight tabular-nums text-text-primary">
              {selectedCount}
            </span>
            <span className="text-lg font-medium text-text-secondary">{noun}</span>
            <span className="text-md text-text-muted">of {totalCount} claimable</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <GradientButton variant="secondary" onClick={onToggleAll}>
            {allSelected ? 'Clear selection' : 'Select all'}
          </GradientButton>
          <GradientButton onClick={onClaim} disabled={claimDisabled}>
            {isPending ? 'Preparing…' : `Claim ${selectedCount} ${noun}`}
          </GradientButton>
        </div>
      </div>

      {!canClaim && (
        <p className="relative mt-4 text-md text-text-muted">
          You're previewing this address. Connect the wallet that owns it to claim.
        </p>
      )}
    </Card>
  );
}
