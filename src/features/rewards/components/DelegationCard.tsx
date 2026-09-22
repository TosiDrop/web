import { useMemo, useState } from 'react';
import { IconArrowRight, IconCheck, IconExternalLink, IconInfoCircle, IconLoader2, IconShieldCheck } from '@tabler/icons-react';
import { Card } from '@/components/common/Card';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { networkFromId } from '@/shared/network';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { usePartnerPools, type TeamPool } from '@/features/team/api/team.queries';
import { useDelegatedPool } from '../hooks/useDelegatedPool';
import { useDelegateToPool } from '../hooks/useDelegateToPool';
import { canonicalPoolId } from '../api/pools.queries';

function PoolLogo({ pool }: { pool: TeamPool }) {
  const [failed, setFailed] = useState(false);
  if (pool.logo && !failed) {
    return <img src={pool.logo} alt="" onError={() => setFailed(true)} className="h-9 w-9 rounded-full border border-border-subtle bg-surface-inset object-cover" />;
  }
  return <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-surface-inset font-mono text-2xs text-text-secondary">{(pool.ticker || 'POOL').slice(0, 4)}</span>;
}

function poolIdLabel(poolId: string): string {
  return poolId.length > 24 ? `${poolId.slice(0, 12)}…${poolId.slice(-8)}` : poolId;
}

export function DelegationCard() {
  const { connected, stakeAddress, networkId } = useWalletStore();
  const networkMatches = !connected || networkFromId(networkId) === DEPLOYMENT_NETWORK;
  const { data: pools, isLoading: poolsLoading, error: poolsError } = usePartnerPools();
  const { poolId, registered, isLoading: delegationLoading, error: delegationError, refetch } = useDelegatedPool(stakeAddress);
  const { delegate, isPending, error: submitError } = useDelegateToPool();
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const currentPool = useMemo(
    () => pools?.find((pool) => canonicalPoolId(pool.poolId) === canonicalPoolId(poolId ?? '')),
    [pools, poolId],
  );
  const selectedPool = pools?.find((pool) => pool.poolId === selectedPoolId);
  const choice = selectedPool ?? (currentPool ? undefined : pools?.[0]);
  const delegationKnown = !delegationLoading && !delegationError && registered !== null;

  async function handleDelegate() {
    if (!choice || !networkMatches || !delegationKnown || registered === null || isPending) return;
    setTxHash(null);
    const result = await delegate(choice.poolId, registered);
    setTxHash(result);
    await refetch();
  }

  if (!connected || !stakeAddress) {
    return (
      <Card className="p-5">
        <p className="label-eyebrow">Wallet & delegation</p>
        <p className="mt-2 text-sm text-text-muted">Connect your wallet to see your stake pool and manage delegation.</p>
      </Card>
    );
  }

  return (
    <Card as="section" className="overflow-hidden" aria-labelledby="delegation-heading">
      <div className="border-b border-border-subtle px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="label-eyebrow">Wallet & delegation</p>
            <h2 id="delegation-heading" className="mt-1.5 text-base font-semibold text-text-primary">Put your wallet to work</h2>
          </div>
          <IconShieldCheck size={20} className="text-cream" stroke={1.5} aria-hidden />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">Delegate to a partner pool to qualify for TosiDrop distributions.</p>
      </div>

      {delegationError && <div className="px-5 pt-4"><FeedbackBanner tone="error" title="Couldn’t check delegation" message={delegationError.message} /></div>}
      {submitError && <div className="px-5 pt-4"><FeedbackBanner tone="error" title="Delegation transaction failed" message={submitError.message} /></div>}
      {txHash && <div className="flex items-center gap-2 px-5 pt-4 text-xs text-status-success-light"><IconCheck size={15} /> Delegation submitted. It takes effect after the next epoch boundary.</div>}

      <div className="space-y-4 px-5 py-4">
        <div className="rounded-xl border border-border-subtle bg-surface-inset p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-eyebrow">Your delegation</p>
              <p className="mt-1 text-xs text-text-muted">Current ledger state</p>
            </div>
            {delegationKnown && (
              <span className={currentPool
                ? 'rounded-full bg-status-success/10 px-2 py-1 text-2xs text-status-success-light'
                : poolId
                  ? 'rounded-full bg-cream/10 px-2 py-1 text-2xs text-cream'
                  : 'rounded-full bg-white/[0.06] px-2 py-1 text-2xs text-text-muted'}>
                {currentPool ? 'Partner pool' : poolId ? 'Other pool' : 'Not delegated'}
              </span>
            )}
          </div>
          {delegationLoading ? <p className="mt-4 text-sm text-text-muted">Checking the ledger…</p> : !delegationKnown ? (
            <p className="mt-4 text-sm text-text-muted">Delegation status is unavailable. Try checking again before submitting a delegation.</p>
          ) : currentPool ? (
            <div className="mt-4 flex items-center gap-3">
              <PoolLogo pool={currentPool} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{currentPool.name || currentPool.ticker}</p>
                <p className="font-mono text-2xs text-text-muted">[{currentPool.ticker}]</p>
              </div>
            </div>
          ) : poolId ? (
            <div className="mt-4 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-sidebar font-mono text-2xs text-text-secondary">POOL</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">A Cardano stake pool</p>
                <p className="mt-1 font-mono text-2xs text-text-muted" title={poolId}>{poolIdLabel(poolId)}</p>
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-text-muted">
                  <IconInfoCircle size={14} className="mt-0.5 shrink-0 text-cream" />
                  This pool is not currently in TosiDrop&apos;s partner network. Your delegation remains active; switching is optional.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">You are not currently delegated to a stake pool.</p>
          )}
        </div>

        {poolsError ? <FeedbackBanner tone="error" title="Couldn’t load partner pools" message={poolsError.message} /> : poolsLoading ? <p className="text-sm text-text-muted">Loading partner pools…</p> : pools && pools.length > 0 ? (
          <div className="space-y-2">
            <label htmlFor="delegation-pool" className="label-eyebrow">Choose a partner pool</label>
            <select id="delegation-pool" value={selectedPoolId || currentPool?.poolId || pools[0].poolId} onChange={(event) => setSelectedPoolId(event.target.value)} className="w-full rounded-lg border border-border-default bg-surface-inset px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent">
              {pools.map((pool) => <option key={pool.poolId} value={pool.poolId}>{pool.ticker || pool.name} — {pool.name}</option>)}
            </select>
            <GradientButton className="w-full" onClick={handleDelegate} disabled={!networkMatches || !delegationKnown || isPending || !choice || canonicalPoolId(choice.poolId) === canonicalPoolId(poolId ?? '')}>
              {isPending ? <><IconLoader2 size={16} className="animate-spin" /> Waiting for wallet…</> : <><IconArrowRight size={16} /> {poolId ? 'Switch delegation' : 'Delegate wallet'}</>}
            </GradientButton>
            {!networkMatches && <p className="text-xs text-status-error-light">Switch your wallet to {DEPLOYMENT_NETWORK} before delegating.</p>}
          </div>
        ) : <p className="text-sm text-text-muted">No partner pools are listed right now.</p>}
      </div>
      {currentPool && <a href={`https://${DEPLOYMENT_NETWORK === 'mainnet' ? '' : 'preview.'}cexplorer.io/pool/${currentPool.poolId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 border-t border-border-subtle px-5 py-3 text-xs text-text-muted transition hover:text-accent-light">View pool details <IconExternalLink size={12} /></a>}
    </Card>
  );
}
