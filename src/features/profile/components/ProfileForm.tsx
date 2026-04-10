import { useState, useEffect, type FormEvent } from 'react';
import { useWallet } from '@meshsdk/react';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useSaveProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { signProfileUpdateMessage } from '@/utils/profile-helpers';

interface ProfileFormProps {
  currentName?: string;
}

export function ProfileForm({ currentName }: ProfileFormProps) {
  const { wallet, connected } = useWallet();
  const { stakeAddress, changeAddress } = useWalletStore();
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
    try {
      const { signature, key, message } = await signProfileUpdateMessage({
        wallet,
        address: changeAddress,
        displayAddress: stakeAddress,
        name,
      });

      await saveProfile.mutateAsync({
        walletId: stakeAddress,
        value: { name: name.trim() },
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
        <label htmlFor="display-name" className="block text-xs text-slate-400 mb-1">
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name"
          className="w-full rounded-lg border border-border-subtle bg-surface-inset px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-cyan/40 focus:outline-none"
          required
        />
      </div>

      {showSuccess && (
        <FeedbackBanner tone="success" message="Profile saved." />
      )}

      {(saveProfile.isError || signError) && (
        <FeedbackBanner
          tone="error"
          message={saveProfile.error?.message || signError || 'Error saving profile.'}
        />
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saveProfile.isPending || !connected || !hasChanged || !name.trim()}
          className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-medium text-surface-base transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveProfile.isPending ? 'Saving...' : 'Save'}
        </button>
        {!connected && (
          <span className="text-xs text-slate-500">
            Connect a wallet first.
          </span>
        )}
      </div>
    </form>
  );
}
