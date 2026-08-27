import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useEstimateFees } from '@/features/rewards/api/fees.queries';
import { formatAda } from '@/utils/format';

interface RewardsSummaryProps {
  tokenCount: number;
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

export function RewardsSummary({ tokenCount }: RewardsSummaryProps) {
  const { data, isLoading, error } = useEstimateFees(tokenCount);

  if (tokenCount === 0) {
    return (
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-text-secondary">Fee breakdown</h3>
        <p className="mt-3 text-xs text-text-muted">Select tokens to see the deposit required.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
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
            A 1 ADA non-whitelisted pool fee applies if your delegated pool is not whitelisted.
            The final amount is confirmed on the deposit page.
          </p>
        </>
      )}
    </Card>
  );
}
