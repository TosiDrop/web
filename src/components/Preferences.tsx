import { useState } from 'react';
import { useWalletState } from '../store/wallet-state';

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
      const messageToSign = `Update profile for ${walletAddress} with name: ${name}`;
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(messageToSign);
      const hexMessage = Array.from(messageBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const signature = await new Promise<string>((resolve, reject) => {
        try {
          wallet.signData(walletAddress, hexMessage)
            .then((result: { signature: string }) => resolve(result.signature))
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });

      // Send the request with signature
      const response = await fetch('/api/profileData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletId: walletAddress,
          value: { name },
          signature,
          message: messageToSign
        }),
      });

      const data = await response.json() as { error?: string };

      if (response.ok) {
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
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl max-w-4xl w-full p-8 border border-white/20">
          <h1 className="text-4xl font-bold text-center text-white mb-6">Preferences</h1>

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