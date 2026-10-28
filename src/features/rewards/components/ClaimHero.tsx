import { Card } from '@/components/common/Card';
import { GradientButton } from '@/components/common/GradientButton';

interface ClaimHeroProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onSelectNextBatch: () => void;
  onClaim: () => void;
  claimDisabled: boolean;
  isPending: boolean;
  canClaim: boolean;
  maxAssets: number;
}

export function ClaimHero({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onSelectNextBatch,
  onClaim,
  claimDisabled,
  isPending,
  canClaim,
  maxAssets,
}: ClaimHeroProps) {
  const noun = selectedCount === 1 ? 'token' : 'tokens';

  return (
    <Card as="section" aria-labelledby="claim-hero-title" className="relative overflow-hidden p-6">

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="claim-hero-title" className="label-eyebrow">Ready to claim</h2>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span role="status" aria-live="polite" className="text-5xl font-semibold leading-none tracking-tight tabular-nums text-text-primary">
              {selectedCount}
            </span>
            <span className="text-lg font-medium text-text-secondary">{noun}</span>
            <span className="text-md text-text-muted">of {totalCount} claimable</span>
          </div>
          {totalCount > maxAssets && (
            <p className="mt-2 text-xs text-text-muted">
              Up to {maxAssets} token types per claim. You can claim another batch afterward.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {totalCount > maxAssets && (
            <GradientButton variant="ghost" onClick={onSelectNextBatch}>
              Select next batch
            </GradientButton>
          )}
          <GradientButton variant="secondary" onClick={onToggleAll}>
            {allSelected ? 'Clear selection' : totalCount > maxAssets ? 'Select first batch' : 'Select all'}
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
