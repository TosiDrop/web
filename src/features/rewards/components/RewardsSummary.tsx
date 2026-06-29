import { useEstimateFees } from '@/features/rewards/api/fees.queries';
import { formatAda } from '@/utils/format';

interface RewardsSummaryProps {
  tokenCount: number;
}

function FeeRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-slate-400">
        {label}
        {hint && <span className="ml-1 text-slate-500">{hint}</span>}
      </span>
      <span className="tabular-nums text-slate-200">{value}</span>
    </div>
  );
}

export function RewardsSummary({ tokenCount }: RewardsSummaryProps) {
  const { data, isLoading, error } = useEstimateFees(tokenCount);

  if (tokenCount === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
        <h3 className="text-xs font-medium text-slate-400">Fee breakdown</h3>
        <p className="mt-3 text-xs text-slate-500">No rewards to claim.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium text-slate-400">Fee breakdown</h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}
        </span>
      </div>

      {isLoading && (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-surface-inset" />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-amber-400">Could not load fee estimate.</p>
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
              <span className="font-medium text-white">Deposit required</span>
              <span className="tabular-nums font-semibold text-white">
                {formatAda(data.deposit)} ADA
              </span>
            </div>
          </div>

          <p className="mt-3 text-[10px] leading-snug text-slate-500">
            +1 ADA TosiFee applies if your delegated pool is not whitelisted.
            Final amount is confirmed on the deposit page.
          </p>
        </>
      )}
    </div>
  );
}
