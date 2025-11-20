import { useWalletState } from '../store/wallet-state';
import { getRewards } from '../api/getRewards';
import { useState } from 'react';
import type { ClaimableToken } from '../types/rewards';

const Home = () => {
  const { walletAddress } = useWalletState();
  const [inputAddress, setInputAddress] = useState(walletAddress || '');
  const [rewards, setRewards] = useState<ClaimableToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetRewards = async () => {
    const addressToUse = inputAddress || walletAddress;
    if (!addressToUse) {
      setError("Wallet address is not available.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setRewards([]);
    
    try {
      console.log(`Getting rewards for wallet: ${addressToUse}`);
      const fetchedRewards = await getRewards(addressToUse);
      console.log('Rewards received:', fetchedRewards);
      setRewards(fetchedRewards);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error getting rewards:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
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
                placeholder="Enter your Cardano wallet address"
                className="w-full bg-white/5 text-blue-100 p-2 rounded border border-white/10"
              />
            </div>
            <div className="p-6 rounded-lg text-center">
              <button
                onClick={handleGetRewards}
                disabled={!inputAddress || loading}
                className="bg-blue-500 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
              >
                {loading ? 'Loading...' : 'Get Rewards'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {rewards.length > 0 && (
              <div className="mt-6">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Rewards ({rewards.length} token{rewards.length !== 1 ? 's' : ''})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((token, index) => (
                    <div
                      key={`${token.assetId}-${index}`}
                      className={`p-4 rounded-lg border ${
                        token.premium
                          ? 'bg-purple-500/10 border-purple-500'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {token.logo && (
                            <img
                              src={token.logo}
                              alt={token.ticker}
                              className="w-8 h-8 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-semibold">
                                {token.ticker || token.assetId.slice(0, 8)}
                              </span>
                              {token.premium && (
                                <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded">
                                  Premium
                                </span>
                              )}
                              {token.native && (
                                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded">
                                  Native
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs mt-1 break-all">
                              {token.assetId}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Amount:</span>
                            <span className="text-white font-semibold">
                              {token.amount.toLocaleString()}
                            </span>
                          </div>
                          {token.price > 0 && (
                            <>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-gray-400 text-sm">Price:</span>
                                <span className="text-gray-300 text-sm">
                                  {token.price.toFixed(6)} ADA
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-gray-400 text-sm">Total:</span>
                                <span className="text-green-400 font-semibold">
                                  {token.total.toFixed(6)} ADA
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {rewards.some(t => t.total > 0) && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                    <p className="text-white font-semibold text-center">
                      Total Value:{' '}
                      <span className="text-green-400">
                        {rewards.reduce((sum, token) => sum + token.total, 0).toFixed(6)} ADA
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {!loading && rewards.length === 0 && !error && (
              <div className="text-center text-gray-400 mt-6">
                Enter a wallet address and click "Get Rewards" to see your claimable tokens
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;