import { useState, useRef, useEffect } from 'react';
import { useWallet, useWalletList } from '@meshsdk/react';
import type { Wallet } from '@meshsdk/common';

export function ConnectWallet() {
  const { connect, disconnect, connected, connecting } = useWallet();
  const wallets = useWalletList();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  function handleConnect(walletName: string): void {
    connect(walletName)
      .catch((error) => console.error('Failed to connect wallet:', error))
      .finally(() => setOpen(false));
  }

  if (connected) {
    return (
      <button
        onClick={disconnect}
        aria-label="Disconnect wallet"
        className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-slate-400 transition hover:bg-surface-overlay hover:text-white"
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
        aria-expanded={open}
        aria-haspopup="listbox"
        className="rounded-lg bg-brand-cyan px-3.5 py-1.5 text-xs font-medium text-surface-base transition hover:bg-cyan-300 disabled:opacity-40"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border-default bg-surface-raised p-2 shadow-2xl shadow-black/40">
          {wallets.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">
              No Cardano wallets found.
            </p>
          ) : (
            <div className="space-y-0.5">
              <p className="px-3 py-1.5 text-[11px] font-medium text-slate-500">
                Select wallet
              </p>
              {wallets.map((w: Wallet) => (
                <button
                  key={w.name}
                  onClick={() => handleConnect(w.name)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-surface-overlay hover:text-white"
                >
                  <img src={w.icon} alt={w.name} className="h-5 w-5 rounded" />
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
