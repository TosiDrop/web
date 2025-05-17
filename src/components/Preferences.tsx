import { useState } from 'react';
import { useWalletState } from '../store/wallet-state';
import { signProfileUpdateMessage, saveProfileData } from '../utils/profile-helpers';

const Preferences = () => {
  const { wallet, walletAddress } = useWalletState();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress || !wallet) {
      setMessage('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const { signature, message: signedMessage } = await signProfileUpdateMessage(wallet, walletAddress, name);
      const data = await saveProfileData(walletAddress, name, signature, signedMessage);

      if (data.success) {
        setMessage('Profile saved successfully!');
        setName('');
      } else {
        setMessage(`Error: ${data.error || 'Failed to save profile'}`);
      }
    } catch (error) {
      setMessage('Error signing message or connecting to server');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-center text-white mb-6">Preferences</h1>
          {name && <p className="text-center text-white mb-6">Welcome {name}</p>}
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="mb-4">
              <label htmlFor="name" className="block text-white text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 text-white p-3 rounded border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>

            {message && (
              <div className={`mt-4 p-3 rounded ${message.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                {message}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading || !walletAddress}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Profile'}
              </button>

              {!walletAddress && (
                <p className="mt-2 text-yellow-400 text-sm">
                  Please connect your wallet to save preferences
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Preferences;