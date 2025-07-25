import { useWalletState } from '../store/wallet-state';
import { getRewards } from '../api/getRewards';
import { useState } from 'react';

const Home = () => {
  const { walletAddress } = useWalletState();
  const [inputAddress, setInputAddress] = useState(walletAddress || '');

  const handleGetRewards = async () => {
    const addressToUse = inputAddress || walletAddress;
    if (!addressToUse) {
      console.error("Wallet address is not available.");
      return;
    }
    try {
      console.log(`Getting rewards for wallet: ${addressToUse}`);
      const rewards = await getRewards(addressToUse);
      console.log('Rewards received:', rewards);
    } catch (error) {
      console.error('Error getting rewards:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-center text-white mb-6">TosiDrop</h1>

          <div className="gap-6 mt-8">
            <div className="p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-white mb-6 text-center">Wallet Address</h2>
              <input
                type="text"
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className="w-full bg-white/5 text-blue-100 p-2 rounded border border-white/10"
              />
            </div>
            <div className="p-6 rounded-lg text-center">
              <button
                onClick={handleGetRewards}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                disabled={!inputAddress}
              >
                Get Tokens
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;