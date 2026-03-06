import { useState, type FormEvent } from 'react';
import { useWallet } from '@meshsdk/react';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import { useSaveProfile } from '@/features/profile/api/profile.queries';
import { useWalletStore } from '@/store/wallet-state';
import { signProfileUpdateMessage } from '@/utils/profile-helpers';

export function ProfileForm() {
  const { wallet, connected } = useWallet();
  const { stakeAddress, changeAddress } = useWalletStore();
  const saveProfile = useSaveProfile();
  const [name, setName] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!wallet || !stakeAddress || !changeAddress) return;

    try {
      const { signature, message } = await signProfileUpdateMessage({
        wallet,
        address: changeAddress,
        displayAddress: stakeAddress,
        name,
      });

      await saveProfile.mutateAsync({
        walletId: stakeAddress,
        value: { name },
        signature,
        message,
      });

      setName('');
    } catch (error) {
      console.error('Profile save error:', error);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label htmlFor="display-name" className="block text-sm font-medium text-gray-200">
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a friendly name"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          required
        />
      </div>

      {saveProfile.isSuccess && (
        <FeedbackBanner tone="success" message="Profile saved successfully!" />
      )}

      {saveProfile.isError && (
        <FeedbackBanner
          tone="error"
          message={saveProfile.error?.message || 'Error saving profile.'}
        />
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={saveProfile.isPending || !connected}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {saveProfile.isPending ? 'Saving...' : 'Save profile'}
        </button>
        {!connected && (
          <p className="text-sm text-yellow-400">
            Connect a wallet to update your preferences.
          </p>
        )}
      </div>
    </form>
  );
}
