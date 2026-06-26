import { useEffect } from 'react';
import { GradientButton } from '@/components/common/GradientButton';
import { usePreferences } from '@/features/favorites/hooks/usePreferences';
import { toast } from '@/store/toast-state';

export function FavoritesSaveBar() {
  const { isDirty, persist, reset, saving, error, connected } = usePreferences();

  // Surface save failures (e.g. "user declined sign data") as a transient
  // toast rather than a persistent inline banner.
  useEffect(() => {
    if (error) toast.error(error, 'Could not save preferences');
  }, [error]);

  if (!isDirty) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/[0.05] px-4 py-3.5">
      <div>
        <p className="text-sm text-[#D7D9E0]">You have unsaved preference changes.</p>
        {!connected && (
          <p className="mt-0.5 text-xs text-[#6B7895]">
            Connect your wallet to save preferences.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <GradientButton variant="secondary" onClick={reset} disabled={saving}>
          Discard
        </GradientButton>
        <GradientButton onClick={persist} disabled={saving || !connected}>
          {saving ? 'Saving…' : 'Save changes'}
        </GradientButton>
      </div>
    </div>
  );
}
