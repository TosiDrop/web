import { useState, useRef, useEffect } from 'react';
import { useWallet, useWalletList } from '@meshsdk/react';
import type { ICardanoWallet } from '@meshsdk/react';

export function ConnectWallet() {
  const { connect, disconnect, connected, connecting } = useWallet();
  const wallets = useWalletList();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleConnect = async (walletName: string) => {
    await connect(walletName);
    setOpen(false);
  };

  if (connected) {
    return (
      <button
        onClick={disconnect}
        className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
      >
        Disconnect
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={connecting}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:bg-gray-600"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-gray-900 p-3 shadow-2xl">
          {wallets.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No Cardano wallets found. Install a wallet extension to continue.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                Select wallet
              </p>
              {wallets.map((w: ICardanoWallet) => (
                <button
                  key={w.name}
                  onClick={() => handleConnect(w.name)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  <img src={w.icon} alt={w.name} className="h-6 w-6 rounded" />
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
