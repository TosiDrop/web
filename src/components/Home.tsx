import { useWalletState } from '../store/wallet-state';

const Home = () => {
  const { walletAddress } = useWalletState();

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
                value={walletAddress || ''}
                readOnly
                className="w-full bg-white/5 text-blue-100 p-2 rounded border border-white/10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;