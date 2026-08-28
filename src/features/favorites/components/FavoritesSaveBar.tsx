import { useEffect } from 'react';
import { Card } from '@/components/common/Card';
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
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div>
        <p className="text-sm text-text-secondary">You have unsaved changes.</p>
        {!connected && (
          <p className="mt-0.5 text-xs text-text-muted">Connect your wallet to save them.</p>
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
    </Card>
  );
}
