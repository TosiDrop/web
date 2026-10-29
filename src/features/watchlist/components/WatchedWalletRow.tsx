import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconPencil, IconRefresh, IconTrash } from '@tabler/icons-react';
import { GradientButton } from '@/components/common/GradientButton';
import { useWalletStore } from '@/store/wallet-state';
import { useWatchedRewards } from '../api/watchedRewards.queries';
import type { WatchedWallet } from '../storage';
import { useOnboardingStore } from '@/store/onboarding-state';
import { buttonClassName } from '@/lib/button';

interface Props { wallet: WatchedWallet; onRename: (name: string) => boolean; onRemove: () => void }
export function WatchedWalletRow({ wallet, onRename, onRemove }: Props) {
  const { data, error, isPending, isFetching, refetch, dataUpdatedAt } = useWatchedRewards(wallet.address);
  const openModal = useOnboardingStore((state) => state.openModal);
  const signingAddress = useWalletStore((state) => state.connected ? state.stakeAddress : null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(wallet.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const isConnected = signingAddress === wallet.address;
  const assets = new Set(data?.map((reward) => reward.assetId));
  return (
    <article className="min-w-0 border-t border-border-subtle py-6 first:border-t-0 first:pt-0" aria-label={wallet.name}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <h2 className="break-words text-lg font-semibold text-text-primary">{wallet.name}</h2>
          <p className="mt-1 break-all font-mono text-xs leading-5 text-text-muted">{wallet.address}</p>
          <p className={`mt-2 text-xs ${isConnected ? 'text-status-success-light' : 'text-text-secondary'}`}>{isConnected ? 'Connected wallet · ready to claim' : 'Read-only · Connect this wallet to claim'}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <GradientButton variant="ghost" aria-label={`Refresh rewards for ${wallet.name}`} disabled={isFetching} onClick={() => { void refetch(); }}><IconRefresh size={18} stroke={1.7} aria-hidden /></GradientButton>
          <GradientButton variant="ghost" aria-label={`Rename ${wallet.name}`} onClick={() => { setName(wallet.name); setNameError(null); setEditing(true); }}><IconPencil size={18} stroke={1.7} aria-hidden /></GradientButton>
          <GradientButton variant="ghost" aria-label={`Remove ${wallet.name}`} onClick={onRemove}><IconTrash size={18} stroke={1.7} aria-hidden /></GradientButton>
        </div>
      </div>
      {editing && <form onSubmit={(event) => { event.preventDefault(); if (!name.trim()) { setNameError('Enter a wallet name.'); return; } if (onRename(name.trim())) setEditing(false); }} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1 basis-40 text-xs text-text-secondary">New wallet name
          <input autoFocus required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border-subtle bg-surface-inset px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent" />
        </label>
        <GradientButton type="submit">Save name</GradientButton><GradientButton variant="ghost" onClick={() => setEditing(false)}>Cancel</GradientButton>
        {nameError && <p role="alert" className="w-full text-xs text-status-error-light">{nameError}</p>}
      </form>}
      <div className="mt-4">
        {isPending ? <p role="status" className="text-sm text-text-muted">Checking current rewards…</p>
          : error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-inset p-4"><div><p className="text-sm font-medium text-text-primary">Rewards could not be loaded</p><p className="mt-1 text-xs leading-5 text-text-muted">Retry to check this wallet’s available rewards.</p></div><GradientButton variant="secondary" aria-label={`Retry rewards for ${wallet.name}`} onClick={() => { void refetch(); }}>Retry</GradientButton></div>
          : data?.length ? <>
            <p className="mb-3 text-xs text-text-muted">{assets.size} {assets.size === 1 ? 'asset' : 'assets'} available now</p>
            <ul className="divide-y divide-border-subtle rounded-xl bg-surface-inset px-4" aria-label={`Current rewards for ${wallet.name}`}>
              {data.map((reward, index) => <li key={`${reward.assetId}:${reward.premium}:${index}`} className="flex min-w-0 items-center justify-between gap-3 py-3 text-sm"><Link to={`/tokens/${encodeURIComponent(reward.assetId)}`} className="flex min-h-11 min-w-0 items-center break-all font-medium text-accent-light underline-offset-4 hover:underline">{reward.ticker || reward.assetId}</Link><span className="max-w-[60%] break-all text-right font-mono tabular-nums text-text-primary">{reward.amount.toLocaleString(undefined, { maximumSignificantDigits: 15 })}</span></li>)}
            </ul>
            {!isConnected && <GradientButton variant="secondary" className="mt-4" onClick={openModal}>Connect matching wallet</GradientButton>}
            {isConnected && <Link to="/claim" className={buttonClassName('primary', 'md', 'mt-4')}>Review and claim rewards</Link>}
          </> : <p className="text-sm text-text-muted">No rewards available right now</p>}
        {!!dataUpdatedAt && !error && <p className="mt-3 text-xs text-text-muted">{isFetching ? 'Refreshing rewards…' : `Last checked ${new Date(dataUpdatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}</p>}
      </div>
    </article>
  );
}
