import { useState, type FormEvent } from 'react';
import { FeedbackBanner } from '@/components/common/FeedbackBanner';
import {
  saveProfileData,
  signProfileUpdateMessage,
} from '@/utils/profile-helpers';
import type { CardanoWalletApi } from '@/types/wallet';

interface ProfileFormProps {
  walletApi: CardanoWalletApi | null;
  walletAddress: string | null;
  signingAddress: string | null;
}

interface StatusState {
  tone: 'success' | 'error';
  message: string;
}

export const ProfileForm = ({
  walletApi,
  walletAddress,
  signingAddress,
}: ProfileFormProps) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<StatusState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!walletApi || !walletAddress || !signingAddress) {
      setStatus({
        tone: 'error',
        message: 'Please connect your wallet before saving preferences.',
      });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const { signature, message } = await signProfileUpdateMessage({
        wallet: walletApi,
        address: signingAddress,
        displayAddress: walletAddress,
        name,
      });
      const response = await saveProfileData(
        walletAddress,
        name,
        signature,
        message
      );

      if (response.success) {
        setStatus({
          tone: 'success',
          message: 'Profile saved successfully!',
        });
        setName('');
      } else {
        setStatus({
          tone: 'error',
          message: response.error || 'Failed to save profile.',
        });
      }
    } catch (error) {
      console.error('Profile save error:', error);
      setStatus({
        tone: 'error',
        message: 'Error signing message or connecting to server.',
      });
    } finally {
      setIsLoading(false);
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
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter a friendly name"
          className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          required
        />
      </div>

      {status && (
        <FeedbackBanner tone={status.tone} message={status.message} />
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isLoading || !walletApi || !walletAddress}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-600"
        >
          {isLoading ? 'Saving...' : 'Save profile'}
        </button>
        {!walletAddress && (
          <p className="text-sm text-yellow-400">
            Connect a wallet to update your preferences.
          </p>
        )}
      </div>
    </form>
  );
};

