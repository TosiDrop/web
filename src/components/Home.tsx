import { useWalletState } from '../store/wallet-state';

const Home = () => {
  const { walletAddress } = useWalletState();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-2xl max-w-4xl w-full p-8 border border-white/20">
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