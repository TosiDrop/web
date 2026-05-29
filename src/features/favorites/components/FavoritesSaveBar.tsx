import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useFavorites } from '@/features/favorites/hooks/useFavorites';

export function FavoritesSaveBar() {
  const { isDirty, persist, reset, saving, error, connected } = useFavorites();

  if (!isDirty) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-300">You have unsaved favorite changes.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-300 transition hover:text-white disabled:opacity-40"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={persist}
            disabled={saving || !connected}
            className="rounded-lg bg-brand-cyan px-4 py-1.5 text-sm font-medium text-surface-base transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save favorites'}
          </button>
        </div>
      </div>
      {!connected && (
        <p className="text-xs text-slate-500">Connect your wallet to save favorites.</p>
      )}
      {error && <FeedbackBanner tone="error" message={error} />}
    </div>
  );
}
