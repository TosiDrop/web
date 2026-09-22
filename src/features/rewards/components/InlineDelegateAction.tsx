import { IconArrowRight, IconCheck, IconLoader2 } from '@tabler/icons-react';
import { useDelegateToPool } from '../hooks/useDelegateToPool';
import { canonicalPoolId } from '../api/pools.queries';

interface InlineDelegateActionProps {
  poolId: string;
  currentPoolId: string | null;
  registered: boolean | null;
  onDelegated: () => void;
}

export function InlineDelegateAction({
  poolId,
  currentPoolId,
  registered,
  onDelegated,
}: InlineDelegateActionProps) {
  const { delegate, isPending, error } = useDelegateToPool();
  const isCurrent = canonicalPoolId(poolId) === canonicalPoolId(currentPoolId ?? '');

  if (isCurrent) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-success-light">
        <IconCheck size={14} stroke={2} />
        Current pool
      </span>
    );
  }

  async function handleDelegate() {
    if (registered === null || isPending) return;
    try {
      await delegate(poolId, registered);
      onDelegated();
    } catch {
      // The inline error keeps the failed action attached to its pool.
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleDelegate}
        disabled={registered === null || isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-contrast transition hover:bg-accent-light disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? <IconLoader2 size={14} className="animate-spin" /> : <IconArrowRight size={14} />}
        {registered === null ? 'Checking…' : currentPoolId ? 'Switch' : 'Delegate'}
      </button>
      {error && <span className="max-w-32 text-right text-2xs text-status-error-light">Transaction failed</span>}
    </div>
  );
}
