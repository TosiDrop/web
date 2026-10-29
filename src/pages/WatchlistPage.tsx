import { useState } from 'react';
import { IconEye, IconPlus } from '@tabler/icons-react';
import { GradientButton } from '@/components/common/GradientButton';
import { isAdaHandle, resolveAdaHandle } from '@/utils/ada-handle';
import { DEPLOYMENT_NETWORK } from '@/config/network';
import { networkLabel } from '@/shared/network';
import { addWatchedWallet, renameWatchedWallet, MAX_WATCHED_WALLETS } from '@/features/watchlist/storage';
import { watchedAddressError } from '@/features/watchlist/validation';
import { useWatchlist } from '@/features/watchlist/useWatchlist';
import { WatchedWalletRow } from '@/features/watchlist/components/WatchedWalletRow';

const fieldClass = 'mt-2 h-11 w-full min-w-0 rounded-xl border border-border-subtle bg-surface-inset px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60';
export default function WatchlistPage() {
  const watchlist = useWatchlist();
  const [name, setName] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const perform = (action: () => void): boolean => {
    try { action(); setError(null); return true; }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Your changes could not be saved. Try again.'); return false; }
  };
  const add = async () => {
    setError(null); setStatus('');
    if (!name.trim()) { setError('Give this wallet a name so you can find it later.'); return; }
    const value = input.trim();
    if (!isAdaHandle(value)) {
      const issue = watchedAddressError(value);
      if (issue) { setError(issue); return; }
    }
    setBusy(true);
    try {
      const address = isAdaHandle(value) ? await resolveAdaHandle(value.toLowerCase()) : value;
      const issue = watchedAddressError(address);
      if (issue) throw new Error(issue);
      watchlist.update((wallets) => addWatchedWallet(wallets, address, name, DEPLOYMENT_NETWORK));
      setName(''); setInput(''); setStatus('Wallet saved on this device.');
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'The wallet could not be added. Check the address or handle and try again.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">Watched wallets</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-text-muted">Check rewards for wallets you follow. Your list stays on this device, and your connected wallet stays in charge of signing claims.</p>
      </header>
      <section aria-labelledby="add-wallet-heading" className="rounded-2xl border border-border-subtle bg-surface-inset/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="add-wallet-heading" className="text-lg font-semibold text-text-primary">Add a wallet</h2><span className="text-xs text-text-muted">{networkLabel(DEPLOYMENT_NETWORK)} · {watchlist.wallets.length}/{MAX_WATCHED_WALLETS} saved</span></div>
        <p id="watchlist-guidance" className="mt-2 text-xs leading-5 text-text-muted">Use a {networkLabel(DEPLOYMENT_NETWORK)} stake address or $handle. Watching is read-only; connect the matching wallet when you want to claim.</p>
        {watchlist.error && <div role="alert" className="mt-4 rounded-xl bg-surface-inset p-4"><p className="text-sm leading-6 text-text-secondary">{watchlist.error}</p><div className="mt-3 flex flex-wrap gap-2"><GradientButton variant="secondary" onClick={watchlist.reload}>Retry loading list</GradientButton><GradientButton variant="ghost" onClick={watchlist.reset}>Reset saved list</GradientButton></div></div>}
        <form onSubmit={(event) => { event.preventDefault(); void add(); }} aria-describedby="watchlist-guidance" className="mt-5 grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <label className="min-w-0 text-xs text-text-secondary">Wallet name<input value={name} maxLength={40} disabled={busy || !!watchlist.error} onChange={(event) => setName(event.target.value)} placeholder="e.g. My staking wallet" autoComplete="off" className={fieldClass} /></label>
          <label className="min-w-0 text-xs text-text-secondary">Stake address or $handle<input value={input} disabled={busy || !!watchlist.error} onChange={(event) => setInput(event.target.value)} placeholder="stake… or $handle" autoComplete="off" autoCapitalize="none" spellCheck={false} className={fieldClass} /></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><GradientButton type="submit" disabled={busy || !!watchlist.error || watchlist.wallets.length >= MAX_WATCHED_WALLETS}><IconPlus size={17} stroke={1.7} aria-hidden />{busy ? 'Checking wallet…' : 'Watch wallet'}</GradientButton><p className="text-xs text-text-muted">Up to 10 wallets per network.</p></div>
        </form>
        {error && <p role="alert" className="mt-4 break-words text-sm leading-6 text-status-error-light">{error}</p>}
        <p role="status" className="mt-3 text-xs text-text-secondary">{status || (watchlist.wallets.length >= MAX_WATCHED_WALLETS ? 'Your list is full. Remove a wallet below to add another.' : '')}</p>
      </section>
      {watchlist.wallets.length ? <section aria-label="Saved wallets" className="min-w-0">
        {watchlist.wallets.map((wallet) => <WatchedWalletRow key={wallet.address} wallet={wallet}
          onRename={(nextName) => perform(() => { watchlist.update((wallets) => renameWatchedWallet(wallets, wallet.address, nextName)); setStatus('Wallet name updated.'); })}
          onRemove={() => { perform(() => { watchlist.update((wallets) => wallets.filter((entry) => entry.address !== wallet.address)); setStatus(`${wallet.name} removed from this device.`); }); }} />)}
      </section> : !watchlist.error && <section className="py-8 text-center"><IconEye size={28} stroke={1.5} aria-hidden className="mx-auto text-accent-light" /><h2 className="mt-4 text-xl font-semibold text-text-primary">Keep an eye on your rewards</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">Add your first wallet above. You’ll see its available rewards here and can refresh whenever you like.</p></section>}
    </div>
  );
}
