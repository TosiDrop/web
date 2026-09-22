import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useEstimateFees } from '@/features/rewards/api/fees.queries';
import { formatAda } from '@/utils/format';
import { formatEstimatedAda, formatEstimatedUsd } from '@/features/market/format';
import type { ClaimValueEstimate } from '@/features/claim/utils/claimValue';

interface RewardsSummaryProps {
  tokenCount: number;
  estimate: ClaimValueEstimate;
}

function FeeRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-text-muted">
        {label}
        {hint && <span className="ml-1 text-text-faint">{hint}</span>}
      </span>
      <span className="tabular-nums text-text-secondary">{value}</span>
    </div>
  );
}

export function RewardsSummary({ tokenCount, estimate }: RewardsSummaryProps) {
  const { data, isLoading, error } = useEstimateFees(tokenCount);

  if (tokenCount === 0) {
    return (
      <Card className="p-5">
        <div className="border-b border-border-subtle pb-4">
          <p className="label-eyebrow">Estimated market value</p>
          <p className="mt-2 text-sm text-text-muted">Select tokens to see an indexed estimate.</p>
        </div>
        <h3 className="text-sm font-semibold text-text-secondary">Fee breakdown</h3>
        <p className="mt-3 text-xs text-text-muted">Select tokens to see the deposit required.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="border-b border-border-subtle pb-4">
        <p className="label-eyebrow">Estimated market value</p>
        {estimate.pricedCount > 0 ? (
          <>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-text-primary">
              {estimate.usd !== null ? formatEstimatedUsd(estimate.usd) : formatEstimatedAda(estimate.ada ?? 0)}
            </p>
            <p className="mt-1 font-mono text-xs tabular-nums text-text-muted">
              {estimate.usd !== null && estimate.ada !== null ? `${formatEstimatedAda(estimate.ada)} · ` : ''}
              {estimate.pricedCount} of {estimate.totalCount} priced
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-text-muted">No indexed prices available yet.</p>
        )}
        <p className="mt-2 text-2xs leading-snug text-text-faint">Display-only estimate from the market index; it does not change the claim deposit.</p>
      </div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-text-secondary">Fee breakdown</h3>
        <span className="font-mono text-2xs tabular-nums text-text-muted">
          {tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}
        </span>
      </div>

      {isLoading && (
        <div className="mt-3 space-y-2" role="status" aria-label="Loading fee estimate">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-3 w-full rounded-md" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <FeedbackBanner
            tone="error"
            message="Could not load the fee estimate. Change your selection to try again."
          />
        </div>
      )}

      {data && !isLoading && (
        <>
          <div className="mt-3 space-y-2">
            <FeeRow
              label="Processing fee"
              value={`${formatAda(Number(data.withdrawal_fee))} ADA`}
            />
            <FeeRow
              label="Token fee"
              hint={`× ${tokenCount}`}
              value={`${formatAda(data.tokens_fee)} ADA`}
            />
            <FeeRow
              label="Transaction fee"
              value={`${formatAda(data.fee)} ADA`}
            />
          </div>

          <div className="mt-3 border-t border-border-subtle pt-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-text-primary">Deposit required</span>
              <span className="tabular-nums font-semibold text-text-primary">
                {formatAda(data.deposit)} ADA
              </span>
            </div>
          </div>

          <p className="mt-3 text-2xs leading-snug text-text-muted">
            A 1 ADA non-partner pool fee applies if your delegated pool is not a partner.
            The final amount is confirmed on the deposit page.
          </p>
        </>
      )}
    </Card>
  );
}
