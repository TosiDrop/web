import { useState, useEffect, type FormEvent } from 'react';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { GradientButton } from '@/components/common/GradientButton';
import { useSaveProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { signProfileUpdateMessage } from '@/utils/profile-helpers';

interface ProfileFormProps {
  currentName?: string;
}

export function ProfileForm({ currentName }: ProfileFormProps) {
  const { wallet, connected, stakeAddress, changeAddress } = useWalletStore();
  const saveProfile = useSaveProfile();
  const [name, setName] = useState(currentName ?? '');
  const [signError, setSignError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setName(currentName ?? '');
  }, [currentName]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!wallet || !stakeAddress || !changeAddress) return;

    setSignError(null);
    setShowSuccess(false);
    const trimmedName = name.trim();
    try {
      const { signature, key, message } = await signProfileUpdateMessage({
        wallet,
        address: changeAddress,
        displayAddress: stakeAddress,
        name: trimmedName,
      });

      await saveProfile.mutateAsync({
        walletId: stakeAddress,
        value: { name: trimmedName },
        signature,
        key,
        message,
      });
      setShowSuccess(true);
    } catch (error) {
      console.error('Profile save error:', error);
      setSignError(error instanceof Error ? error.message : 'Failed to sign or save profile');
    }
  };

  const hasChanged = name.trim() !== (currentName ?? '');

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="display-name" className="mb-1 block text-xs text-text-muted">
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name"
          className="w-full rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-sm text-text-primary placeholder:text-text-faint focus-visible:border-accent"
          required
        />
      </div>

      {showSuccess && <FeedbackBanner tone="success" message="Name saved." />}

      {(saveProfile.isError || signError) && (
        <FeedbackBanner
          tone="error"
          title="Couldn't save your name"
          message={saveProfile.error?.message || signError || 'Try again.'}
        />
      )}

      <div className="flex items-center gap-3">
        <GradientButton
          type="submit"
          disabled={saveProfile.isPending || !connected || !hasChanged || !name.trim()}
        >
          {saveProfile.isPending ? 'Saving…' : 'Save name'}
        </GradientButton>
        {!connected && (
          <span className="text-xs text-text-muted">Connect a wallet to save your name.</span>
        )}
      </div>
    </form>
  );
}
